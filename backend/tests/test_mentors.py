import logging

API = "/api/v1/mentorzy"
ADMIN = "/api/v1/admin"
AREA = "dla-seniorow"

MENTOR = {
    "nazwa": "Mentor Przykładowy",
    "instytucja": "Fundacja Przykład",
    "sektor": "ngo",
    "obszary": [AREA],
    "powiat": "m. Kraków",
    "opis": "Pomaga w pilotażach dla seniorów.",
    "email": "mentor@example.test",
}


async def new_ticket(client) -> tuple[int, str]:
    token = (
        await client.post("/api/v1/zgloszenia", json={"tresc": "Szukam pomocy dla seniorów."})
    ).json()["token_watku"]
    tickets = (await client.get(f"{ADMIN}/zgloszenia")).json()["items"]
    return max(t["id"] for t in tickets), token


async def add_mentor(client, **extra) -> dict:
    response = await client.post(f"{ADMIN}/mentorzy", json={**MENTOR, **extra})
    assert response.status_code == 201, response.text
    return response.json()


async def mentor_token(session_factory, mentor_id: int) -> str:
    from app.models import Mentor

    async with session_factory() as session:
        return (await session.get(Mentor, mentor_id)).token_mentora


async def test_publiczna_lista_bez_emaila_i_tokenu_z_filtrami(admin_client):
    first = await add_mentor(admin_client)
    await add_mentor(admin_client, nazwa="Inny", obszary=["dla-rynku-pracy"], powiat="tarnowski")
    await add_mentor(admin_client, nazwa="Ukryty", aktywny=False)

    response = await admin_client.get(API)
    items = response.json()
    assert {i["nazwa"] for i in items} == {"Mentor Przykładowy", "Inny"}
    assert "mentor@example.test" not in response.text
    assert all("email" not in i and "token_mentora" not in i for i in items)

    by_area = (await admin_client.get(API, params={"obszar": AREA})).json()
    assert [i["id"] for i in by_area] == [first["id"]]
    by_county = (await admin_client.get(API, params={"powiat": "tarnowski"})).json()
    assert [i["nazwa"] for i in by_county] == ["Inny"]


async def test_panel_wymaga_tokenu_i_waliduje(admin_client, client):
    assert (await client.get(f"{ADMIN}/mentorzy")).status_code == 401
    bad_area = await admin_client.post(f"{ADMIN}/mentorzy", json={**MENTOR, "obszary": ["nie-ma"]})
    assert bad_area.status_code == 422
    bad_email = await admin_client.post(f"{ADMIN}/mentorzy", json={**MENTOR, "email": "x"})
    assert bad_email.status_code == 422


async def test_edycja_i_dezaktywacja(admin_client):
    mentor = await add_mentor(admin_client)
    response = await admin_client.patch(
        f"{ADMIN}/mentorzy/{mentor['id']}", json={"aktywny": False, "opis": "Nowy opis mentora."}
    )
    assert response.status_code == 200
    assert response.json()["aktywny"] is False
    assert (await admin_client.get(API)).json() == []
    assert len((await admin_client.get(f"{ADMIN}/mentorzy")).json()) == 1
    assert (await admin_client.patch(f"{ADMIN}/mentorzy/999", json={})).status_code == 404


async def test_prosba_o_mentora(admin_client):
    ticket_id, token = await new_ticket(admin_client)
    assert (await admin_client.post(f"/api/v1/zgloszenia/watek/{token}/mentor")).status_code == 202
    assert (await admin_client.post("/api/v1/zgloszenia/watek/zly/mentor")).status_code == 404

    state = (await admin_client.get(f"{ADMIN}/zgloszenia/{ticket_id}/mentor")).json()
    assert state["mentor_prosba"] is True
    assert state["mentor"] is None
    notes = (await admin_client.get(f"{ADMIN}/powiadomienia")).json()["items"]
    assert any("prosi o mentora" in n["tekst"] for n in notes)


async def test_przydzial_wysyla_email_i_wiadomosc_systemowa(admin_client, caplog):
    ticket_id, token = await new_ticket(admin_client)
    mentor = await add_mentor(admin_client)
    with caplog.at_level(logging.INFO):
        response = await admin_client.patch(
            f"{ADMIN}/zgloszenia/{ticket_id}/mentor", json={"mentor_id": mentor["id"]}
        )
    assert response.status_code == 200
    assert response.json()["mentor"]["id"] == mentor["id"]
    assert "mentor@example.test" in caplog.text
    assert "/mentor/" in caplog.text and token in caplog.text

    thread = (await admin_client.get(f"/api/v1/zgloszenia/watek/{token}")).json()
    assert thread["wiadomosci"][-1]["autor_rola"] == "system"
    assert "Do sprawy dołączył mentor: Mentor Przykładowy" in thread["wiadomosci"][-1]["tresc"]


async def test_przydzial_nieaktywnego_i_nieistniejacego(admin_client):
    ticket_id, _ = await new_ticket(admin_client)
    inactive = await add_mentor(admin_client, aktywny=False)
    url = f"{ADMIN}/zgloszenia/{ticket_id}/mentor"
    assert (await admin_client.patch(url, json={"mentor_id": inactive["id"]})).status_code == 409
    assert (await admin_client.patch(url, json={"mentor_id": 999})).status_code == 404
    assert (
        await admin_client.patch(f"{ADMIN}/zgloszenia/999/mentor", json={"mentor_id": None})
    ).status_code == 404


async def test_mentor_odpowiada_tylko_w_przypisanym_watku(admin_client, session_factory):
    ticket_id, token = await new_ticket(admin_client)
    _, other_token = await new_ticket(admin_client)
    mentor = await add_mentor(admin_client)
    stranger = await add_mentor(admin_client, nazwa="Obcy")
    mtoken = await mentor_token(session_factory, mentor["id"])
    stoken = await mentor_token(session_factory, stranger["id"])

    # Przed przydziałem: brak dostępu.
    url = f"/api/v1/mentor/{mtoken}/watek/{token}"
    assert (await admin_client.get(url)).status_code == 404
    assert (await admin_client.post(url, json={"tresc": "Dzień dobry"})).status_code == 404

    await admin_client.patch(
        f"{ADMIN}/zgloszenia/{ticket_id}/mentor", json={"mentor_id": mentor["id"]}
    )

    thread = await admin_client.get(url)
    assert thread.status_code == 200
    assert thread.json()["mentor_nazwa"] == "Mentor Przykładowy"
    assert "autor_email" not in thread.text

    posted = await admin_client.post(url, json={"tresc": "Służę radą, proszę o szczegóły."})
    assert posted.status_code == 201
    assert posted.json()["wiadomosci"][-1]["autor_rola"] == "mentor"

    # Autor widzi odpowiedź mentora w swoim wątku.
    public = (await admin_client.get(f"/api/v1/zgloszenia/watek/{token}")).json()
    assert public["wiadomosci"][-1]["autor_rola"] == "mentor"

    # Inny wątek, zły token mentora, obcy mentor: wszędzie 404.
    for path in (
        f"/api/v1/mentor/{mtoken}/watek/{other_token}",
        f"/api/v1/mentor/{stoken}/watek/{token}",
        f"/api/v1/mentor/zly/watek/{token}",
    ):
        assert (await admin_client.get(path)).status_code == 404
        assert (await admin_client.post(path, json={"tresc": "Hej"})).status_code == 404

    # Po dezaktywacji mentor traci dostęp.
    await admin_client.patch(f"{ADMIN}/mentorzy/{mentor['id']}", json={"aktywny": False})
    assert (await admin_client.get(url)).status_code == 404


async def test_zdjecie_mentora_odbiera_dostep(admin_client, session_factory):
    ticket_id, token = await new_ticket(admin_client)
    mentor = await add_mentor(admin_client)
    mtoken = await mentor_token(session_factory, mentor["id"])
    endpoint = f"{ADMIN}/zgloszenia/{ticket_id}/mentor"
    await admin_client.patch(endpoint, json={"mentor_id": mentor["id"]})
    await admin_client.patch(endpoint, json={"mentor_id": None})
    assert (await admin_client.get(f"/api/v1/mentor/{mtoken}/watek/{token}")).status_code == 404
