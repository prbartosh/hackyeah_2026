from app.services.opinions import evidence_level

API = "/api/v1"
SLUG = "kody-qr-na-pomoc-seniorom"
URL = f"{API}/innovations/{SLUG}/opinie"

RATING = {
    "rodzaj": "ocena",
    "ocena": 5,
    "instytucja": "OPS w gminie wiejskiej",
    "tresc": "Seniorzy chętnie korzystają z kodów, opiekunowie są spokojniejsi.",
    "usprawnienie": "Większa czcionka na naklejkach.",
}
TEST = {
    "rodzaj": "test",
    "instytucja": "CUS w małym mieście",
    "tresc": "Chcemy sprawdzić rozwiązanie u 10 podopiecznych przez 3 miesiące.",
}


async def publish_all(client):
    items = (await client.get(f"{API}/admin/opinie", params={"status": "nowa"})).json()["items"]
    for item in items:
        response = await client.patch(
            f"{API}/admin/opinie/{item['id']}", json={"status": "opublikowana"}
        )
        assert response.status_code == 200, response.text


async def test_nowa_ocena_niewidoczna_do_zatwierdzenia(admin_client):
    response = await admin_client.post(URL, json=RATING)
    assert response.status_code == 201, response.text
    assert response.json() == {"status": "nowa", "token_watku": None}

    summary = (await admin_client.get(URL)).json()
    assert summary["liczba_ocen"] == 0
    assert summary["opinie"] == []
    assert summary["poziom"]["kod"] == "opisane"

    notifications = (await admin_client.get(f"{API}/admin/powiadomienia")).json()
    assert any("Nowa ocena do zatwierdzenia" in n["tekst"] for n in notifications["items"])


async def test_zgloszenie_do_testow_trafia_do_skrzynki(admin_client):
    response = await admin_client.post(URL, json={**TEST, "autor_email": "ops@example.org"})
    assert response.status_code == 201, response.text
    token = response.json()["token_watku"]
    assert token

    thread = (await admin_client.get(f"{API}/zgloszenia/watek/{token}")).json()
    assert thread["wiadomosci"][0]["tresc"].startswith("[Zgłoszenie do testów]")


async def test_po_zatwierdzeniu_poziom_rosnie(admin_client):
    for score in (5, 4, 4):
        assert (await admin_client.post(URL, json={**RATING, "ocena": score})).status_code == 201
    await publish_all(admin_client)

    summary = (await admin_client.get(URL)).json()
    assert summary["liczba_ocen"] == 3
    assert summary["srednia"] == 4.3
    assert summary["poziom"]["kod"] == "sprawdzone"
    assert summary["opinie"][0]["usprawnienie"] == RATING["usprawnienie"]


async def test_ukryta_opinia_znika(admin_client):
    await admin_client.post(URL, json=RATING)
    item = (await admin_client.get(f"{API}/admin/opinie")).json()["items"][0]
    await admin_client.patch(f"{API}/admin/opinie/{item['id']}", json={"status": "opublikowana"})
    assert (await admin_client.get(URL)).json()["liczba_ocen"] == 1

    await admin_client.patch(f"{API}/admin/opinie/{item['id']}", json={"status": "ukryta"})
    assert (await admin_client.get(URL)).json()["liczba_ocen"] == 0


async def test_walidacja(admin_client):
    no_score = {**RATING, "ocena": None}
    assert (await admin_client.post(URL, json=no_score)).status_code == 422
    assert (await admin_client.post(URL, json={**RATING, "ocena": 6})).status_code == 422
    assert (await admin_client.post(URL, json={**RATING, "tresc": "krótko"})).status_code == 422
    missing = f"{API}/innovations/nie-ma-takiej/opinie"
    assert (await admin_client.post(missing, json=RATING)).status_code == 404
    assert (await admin_client.get(missing)).status_code == 404


async def test_moderacja_wymaga_tokenu(client):
    assert (await client.get(f"{API}/admin/opinie")).status_code in (401, 503)


def test_poziom_dowodu():
    assert evidence_level([], 0).kod == "opisane"
    assert evidence_level([], 1).kod == "pilotaz"
    assert evidence_level([5, 5], 0).kod == "pilotaz"
    assert evidence_level([5, 4, 3], 0).kod == "sprawdzone"
    assert evidence_level([5, 3, 3], 0).kod == "pilotaz"


QUESTION = {
    "tresc": "Jak przekonaliście seniorów do noszenia kodów? Ile to trwało?",
    "instytucja": "OPS w mieście",
    "autor_email": "pyta@example.org",
}


async def test_pytanie_wymaga_testujacej_instytucji(admin_client):
    response = await admin_client.post(f"{URL}/pytanie", json=QUESTION)
    assert response.status_code == 409
    assert not (await admin_client.get(URL)).json()["mozna_zapytac"]


async def test_pytanie_przekazane_do_watku_testujacych(admin_client):
    tester_token = (await admin_client.post(URL, json=TEST)).json()["token_watku"]
    await publish_all(admin_client)
    assert (await admin_client.get(URL)).json()["mozna_zapytac"]

    response = await admin_client.post(f"{URL}/pytanie", json=QUESTION)
    assert response.status_code == 201, response.text
    asker_token = response.json()["token_watku"]

    tickets = await admin_client.get(f"{API}/admin/zgloszenia", params={"sort": "najnowsze"})
    ticket_id = tickets.json()["items"][0]["id"]
    ticket = (await admin_client.get(f"{API}/admin/zgloszenia/{ticket_id}")).json()
    assert ticket["innowacja_slug"] == SLUG
    [tester] = ticket["testujacy"]
    assert tester["instytucja"] == TEST["instytucja"]
    assert "email" not in tester

    forwarded = await admin_client.post(
        f"{API}/admin/zgloszenia/{ticket_id}/przekaz",
        json={"opinia_id": tester["opinia_id"], "tresc": "Dzień dobry, ktoś pyta o kody QR."},
    )
    assert forwarded.status_code == 200, forwarded.text
    assert forwarded.json()["status"] == "w_trakcie"

    thread = (await admin_client.get(f"{API}/zgloszenia/watek/{tester_token}")).json()
    assert thread["wiadomosci"][-1] == {
        **thread["wiadomosci"][-1],
        "autor_rola": "admin",
        "tresc": "Dzień dobry, ktoś pyta o kody QR.",
    }
    # Instytucja odpowiada w swoim wątku, a pytający nie widzi jej danych.
    reply = await admin_client.post(
        f"{API}/zgloszenia/watek/{tester_token}/wiadomosci",
        json={"tresc": "Pomogły spotkania w klubie seniora."},
    )
    assert reply.status_code == 201, reply.text
    asker = (await admin_client.get(f"{API}/zgloszenia/watek/{asker_token}")).json()
    assert len(asker["wiadomosci"]) == 1


async def test_przekazanie_tylko_do_testujacych_te_innowacje(admin_client):
    await admin_client.post(URL, json=TEST)
    await publish_all(admin_client)
    await admin_client.post(f"{URL}/pytanie", json=QUESTION)
    tickets = await admin_client.get(f"{API}/admin/zgloszenia", params={"sort": "najnowsze"})
    ticket_id = tickets.json()["items"][0]["id"]

    response = await admin_client.post(
        f"{API}/admin/zgloszenia/{ticket_id}/przekaz",
        json={"opinia_id": 999, "tresc": "Dzień dobry, ktoś pyta o kody QR."},
    )
    assert response.status_code == 422
