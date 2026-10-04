import logging
import re

API = "/api/v1/partnerstwa"
ADMIN = "/api/v1/admin/partnerstwa-rozmowy"

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


async def start(client, caplog=None):
    offer_id = (await client.post(API, json=OFFER)).json()["id"]
    await client.patch(f"/api/v1/admin/partnerstwa/{offer_id}", json={"status": "opublikowane"})
    if caplog is not None:
        with caplog.at_level(logging.INFO, logger="app.services.email"):
            response = await client.post(f"{API}/{offer_id}/kontakt", json=MESSAGE)
    else:
        response = await client.post(f"{API}/{offer_id}/kontakt", json=MESSAGE)
    assert response.status_code == 202, response.text
    return response.json()["token_rozmowy"]


def author_token(caplog):
    mail = next(r.getMessage() for r in caplog.records if "do ops@example.test" in r.getMessage())
    return re.search(r"/rozmowa/([\w-]+)", mail).group(1)


async def test_tokeny_stron_nie_ujawniaja_emaili(admin_client, caplog):
    sender = await start(admin_client, caplog)
    author = author_token(caplog)
    assert sender != author

    sender_view = await admin_client.get(f"{API}/rozmowy/{sender}")
    author_view = await admin_client.get(f"{API}/rozmowy/{author}")
    assert sender_view.status_code == author_view.status_code == 200
    assert sender_view.json()["twoja_strona"] == "nadawca"
    assert sender_view.json()["druga_strona"] == "Przykładowy OPS"
    assert author_view.json()["twoja_strona"] == "autor"
    assert author_view.json()["druga_strona"] == "Fundacja Przykład"
    assert author_view.json()["wiadomosci"][0]["tresc"] == MESSAGE["tresc"]
    assert "@example.test" not in sender_view.text
    assert "@example.test" not in author_view.text


async def test_odpowiedz_wysyla_email_drugiej_stronie(admin_client, caplog):
    sender = await start(admin_client, caplog)
    author = author_token(caplog)
    caplog.clear()
    with caplog.at_level(logging.INFO, logger="app.services.email"):
        reply = await admin_client.post(
            f"{API}/rozmowy/{author}/wiadomosci", json={"tresc": "Dziękujemy, umówmy się."}
        )
    assert reply.status_code == 201, reply.text
    assert [m["strona"] for m in reply.json()["wiadomosci"]] == ["nadawca", "autor"]
    assert "do fundacja@example.test" in caplog.text
    assert f"/rozmowa/{sender}" in caplog.text
    assert "ops@example.test" not in caplog.text

    seen = (await admin_client.get(f"{API}/rozmowy/{sender}")).json()
    assert len(seen["wiadomosci"]) == 2


async def test_obcy_token_i_walidacja(admin_client):
    assert (await admin_client.get(f"{API}/rozmowy/nie-ma-takiego-tokenu")).status_code == 404
    unknown = await admin_client.post(
        f"{API}/rozmowy/nie-ma-takiego-tokenu/wiadomosci", json={"tresc": "Hej tam"}
    )
    assert unknown.status_code == 404
    token = await start(admin_client)
    empty = await admin_client.post(f"{API}/rozmowy/{token}/wiadomosci", json={"tresc": "x"})
    assert empty.status_code == 422


async def test_zamknieta_rozmowa_tylko_do_odczytu(admin_client):
    token = await start(admin_client)
    listing = (await admin_client.get(ADMIN)).json()
    assert listing["total"] == 1
    assert listing["items"][0]["liczba_wiadomosci"] == 1
    conversation_id = listing["items"][0]["id"]

    closed = await admin_client.post(f"{ADMIN}/{conversation_id}/zamknij")
    assert closed.status_code == 200
    assert closed.json()["status"] == "zamknieta"

    rejected = await admin_client.post(
        f"{API}/rozmowy/{token}/wiadomosci", json={"tresc": "Jeszcze jedno"}
    )
    assert rejected.status_code == 409
    rops = await admin_client.post(
        f"{ADMIN}/{conversation_id}/wiadomosci", json={"tresc": "Wpis ROPS"}
    )
    assert rops.status_code == 409
    view = (await admin_client.get(f"{API}/rozmowy/{token}")).json()
    assert view["status"] == "zamknieta"
    assert len(view["wiadomosci"]) == 1


async def test_wpis_rops_i_podglad_w_panelu(admin_client, caplog):
    sender = await start(admin_client, caplog)
    conversation_id = (await admin_client.get(ADMIN)).json()["items"][0]["id"]
    caplog.clear()
    with caplog.at_level(logging.INFO, logger="app.services.email"):
        response = await admin_client.post(
            f"{ADMIN}/{conversation_id}/wiadomosci", json={"tresc": "ROPS prosi o doprecyzowanie."}
        )
    assert response.status_code == 201, response.text
    assert "do ops@example.test" in caplog.text
    assert "do fundacja@example.test" in caplog.text

    detail = (await admin_client.get(f"{ADMIN}/{conversation_id}")).json()
    assert detail["nadawca_email"] == "fundacja@example.test"
    assert [m["strona"] for m in detail["wiadomosci"]] == ["nadawca", "rops"]
    view = (await admin_client.get(f"{API}/rozmowy/{sender}")).json()
    assert view["wiadomosci"][1]["strona"] == "rops"
    assert (await admin_client.get(f"{ADMIN}/999")).status_code == 404


async def test_panel_rozmow_wymaga_tokenu(client):
    assert (await client.get(ADMIN)).status_code in (401, 503)
