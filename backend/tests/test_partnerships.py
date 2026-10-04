import logging

API = "/api/v1/partnerstwa"
SLUG = "kody-qr-na-pomoc-seniorom"

OFFER = {
    "typ": "szukam_partnera",
    "sektor": "publiczny",
    "instytucja": "Przykładowy OPS",
    "tytul": "Szukamy partnera do pilotażu",
    "opis": "Chcemy wdrożyć rozwiązanie u 20 seniorów i szukamy organizacji do współpracy.",
    "powiat": "m. Kraków",
    "kontakt_email": "ops@example.test",
}
MESSAGE = {
    "nadawca_nazwa": "Fundacja Przykład",
    "nadawca_email": "fundacja@example.test",
    "tresc": "Chętnie pomożemy, mamy wolontariuszy.",
}


async def publish(client, offer_id):
    response = await client.patch(
        f"/api/v1/admin/partnerstwa/{offer_id}", json={"status": "opublikowane"}
    )
    assert response.status_code == 200, response.text


async def test_nowe_ogloszenie_czeka_na_moderacje(admin_client):
    created = await admin_client.post(API, json=OFFER)
    assert created.status_code == 201, created.text
    assert created.json()["status"] == "oczekuje"
    assert (await admin_client.get(API)).json() == []

    pending = (await admin_client.get("/api/v1/admin/partnerstwa?status=oczekuje")).json()
    assert pending["total"] == 1
    assert pending["items"][0]["kontakt_email"] == "ops@example.test"


async def test_publiczna_lista_bez_emaila_i_z_filtrami(admin_client):
    first = (await admin_client.post(API, json=OFFER)).json()["id"]
    other = {**OFFER, "typ": "oferuje_wsparcie", "sektor": "ngo", "powiat": "tarnowski"}
    second = (await admin_client.post(API, json=other)).json()["id"]
    await publish(admin_client, first)
    await publish(admin_client, second)

    items = (await admin_client.get(API)).json()
    assert len(items) == 2
    assert all("kontakt_email" not in item for item in items)
    assert "ops@example.test" not in (await admin_client.get(API)).text

    by_type = (await admin_client.get(API, params={"typ": "oferuje_wsparcie"})).json()
    assert [i["id"] for i in by_type] == [second]
    by_sector = (await admin_client.get(API, params={"sektor": "publiczny"})).json()
    assert [i["id"] for i in by_sector] == [first]
    by_county = (await admin_client.get(API, params={"powiat": "tarnowski"})).json()
    assert [i["id"] for i in by_county] == [second]


async def test_odrzucone_niewidoczne(admin_client):
    offer_id = (await admin_client.post(API, json=OFFER)).json()["id"]
    response = await admin_client.patch(
        f"/api/v1/admin/partnerstwa/{offer_id}", json={"status": "odrzucone"}
    )
    assert response.status_code == 200
    assert (await admin_client.get(API)).json() == []
    assert (await admin_client.post(f"{API}/{offer_id}/kontakt", json=MESSAGE)).status_code == 404


async def test_walidacja(admin_client):
    for patch in (
        {"tytul": "abc"},
        {"opis": "za krótki"},
        {"opis": "x" * 2001},
        {"powiat": "Gdańsk"},
        {"typ": "inny"},
        {"sektor": "inny"},
        {"kontakt_email": "nie-email"},
        {"innowacja_slug": "Zły Slug"},
    ):
        response = await admin_client.post(API, json={**OFFER, **patch})
        assert response.status_code == 422, patch
    missing = await admin_client.post(API, json={**OFFER, "innowacja_slug": "nie-ma-takiej"})
    assert missing.status_code == 404


async def test_powiazana_innowacja_i_filtr(admin_client):
    offer_id = (await admin_client.post(API, json={**OFFER, "innowacja_slug": SLUG})).json()["id"]
    await publish(admin_client, offer_id)
    found = (await admin_client.get(API, params={"innowacja": SLUG})).json()
    assert [i["id"] for i in found] == [offer_id]
    assert (await admin_client.get(API, params={"innowacja": "inna"})).json() == []


async def test_kontakt_przez_rops(admin_client, caplog):
    offer_id = (await admin_client.post(API, json=OFFER)).json()["id"]
    await publish(admin_client, offer_id)
    with caplog.at_level(logging.INFO, logger="app.services.email"):
        response = await admin_client.post(f"{API}/{offer_id}/kontakt", json=MESSAGE)
    assert response.status_code == 202, response.text
    assert "ops@example.test" not in response.text
    # Autor dostaje wiadomość od ROPS, nadawca nie poznaje adresu autora.
    assert "do ops@example.test" in caplog.text
    assert "Chętnie pomożemy" in caplog.text
    assert "fundacja@example.test" not in caplog.text

    notes = (await admin_client.get("/api/v1/admin/powiadomienia")).json()
    assert any("Wiadomość do autora ogłoszenia" in n["tekst"] for n in notes["items"])


async def test_kontakt_walidacja_i_brak_ogloszenia(admin_client):
    assert (await admin_client.post(f"{API}/999/kontakt", json=MESSAGE)).status_code == 404
    offer_id = (await admin_client.post(API, json=OFFER)).json()["id"]
    await publish(admin_client, offer_id)
    bad = await admin_client.post(f"{API}/{offer_id}/kontakt", json={**MESSAGE, "tresc": "x"})
    assert bad.status_code == 422


async def test_panel_wymaga_tokenu(client):
    assert (await client.get("/api/v1/admin/partnerstwa")).status_code in (401, 503)
