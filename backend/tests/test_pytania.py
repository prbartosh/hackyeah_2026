import logging

API = "/api/v1/pytania"
ADMIN = "/api/v1/admin/pytania"

QUESTION = {
    "tresc": "Jak zgłosić potrzebę do ROPS?",
    "autor_nazwa": "Anna",
    "autor_email": "anna@example.test",
    "zgoda_na_publikacje": True,
}


async def ask(client, **overrides) -> int:
    response = await client.post(API, json={**QUESTION, **overrides})
    assert response.status_code == 201, response.text
    assert response.json()["status"] == "nowe"
    return response.json()["id"]


async def answer(client, question_id, text="Opisz sprawę w formularzu zgłoszenia."):
    response = await client.post(f"{ADMIN}/{question_id}/odpowiedz", json={"odpowiedz": text})
    assert response.status_code == 200, response.text
    return response.json()


async def test_nowe_pytanie_niewidoczne_i_powiadomienie(admin_client):
    await ask(admin_client)
    assert (await admin_client.get(API)).json() == []
    notes = (await admin_client.get("/api/v1/admin/powiadomienia")).json()
    assert any("Nowe pytanie do ROPS" in n["tekst"] for n in notes["items"])
    listing = (await admin_client.get(ADMIN, params={"status": "nowe"})).json()
    assert listing["total"] == 1
    assert listing["items"][0]["autor_email"] == "anna@example.test"


async def test_publikacja_bez_emaila_w_odpowiedzi_publicznej(admin_client):
    question_id = await ask(admin_client)
    assert (await answer(admin_client, question_id))["status"] == "odpowiedziane"
    published = await admin_client.post(f"{ADMIN}/{question_id}/publikuj")
    assert published.status_code == 200
    assert published.json()["status"] == "opublikowane"

    response = await admin_client.get(API)
    items = response.json()
    assert len(items) == 1
    assert items[0]["odpowiedz"] == "Opisz sprawę w formularzu zgłoszenia."
    assert "autor_email" not in items[0]
    assert "autor_nazwa" not in items[0]
    assert "anna@example.test" not in response.text


async def test_brak_publikacji_bez_zgody(admin_client):
    question_id = await ask(admin_client, zgoda_na_publikacje=False)
    await answer(admin_client, question_id)
    response = await admin_client.post(f"{ADMIN}/{question_id}/publikuj")
    assert response.status_code == 409
    assert (await admin_client.get(API)).json() == []


async def test_brak_publikacji_bez_odpowiedzi(admin_client):
    question_id = await ask(admin_client)
    assert (await admin_client.post(f"{ADMIN}/{question_id}/publikuj")).status_code == 409


async def test_ukrycie_zdejmuje_z_publicznej_listy(admin_client):
    question_id = await ask(admin_client)
    await answer(admin_client, question_id)
    await admin_client.post(f"{ADMIN}/{question_id}/publikuj")
    hidden = await admin_client.post(f"{ADMIN}/{question_id}/ukryj")
    assert hidden.json()["status"] == "ukryte"
    assert (await admin_client.get(API)).json() == []


async def test_wyszukiwanie_bez_wielkosci_liter_i_polskich_znakow(admin_client):
    first = await ask(admin_client, tresc="Jak zgłosić potrzebę do ROPS?", kategoria="seniorzy")
    second = await ask(admin_client, tresc="Czym jest Biblioteka Innowacji Społecznych?")
    for question_id in (first, second):
        await answer(admin_client, question_id, "Odpowiedź ROPS, żółć i gęślą jaźń.")
        await admin_client.post(f"{ADMIN}/{question_id}/publikuj")

    found = (await admin_client.get(API, params={"q": "ZGLOSIC POTRZEBE"})).json()
    assert [i["id"] for i in found] == [first]
    in_answer = (await admin_client.get(API, params={"q": "zolc"})).json()
    assert len(in_answer) == 2
    by_category = (await admin_client.get(API, params={"kategoria": "seniorzy"})).json()
    assert [i["id"] for i in by_category] == [first]
    assert (await admin_client.get(API, params={"q": "nieistniejace"})).json() == []


async def test_email_do_pytajacego_po_pierwszej_odpowiedzi(admin_client, caplog):
    question_id = await ask(admin_client)
    with caplog.at_level(logging.INFO, logger="app.services.email"):
        await answer(admin_client, question_id, "Pierwsza odpowiedź ROPS.")
    assert "do anna@example.test" in caplog.text
    assert "Pierwsza odpowiedź ROPS." in caplog.text
    caplog.clear()
    with caplog.at_level(logging.INFO, logger="app.services.email"):
        await answer(admin_client, question_id, "Poprawiona odpowiedź ROPS.")
    assert "anna@example.test" not in caplog.text


async def test_pytanie_bez_emaila_i_walidacja(admin_client):
    question_id = await ask(admin_client, autor_nazwa=None, autor_email=None)
    assert (await answer(admin_client, question_id))["autor_email"] is None
    assert (await admin_client.post(API, json={"tresc": "krótko"})).status_code == 422
    bad_mail = await admin_client.post(API, json={**QUESTION, "autor_email": "nie-email"})
    assert bad_mail.status_code == 422
    missing = await admin_client.post(f"{ADMIN}/999/odpowiedz", json={"odpowiedz": "Ok, tak."})
    assert missing.status_code == 404
