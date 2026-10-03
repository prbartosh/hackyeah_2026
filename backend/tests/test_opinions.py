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
