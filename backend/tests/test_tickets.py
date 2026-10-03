from datetime import UTC, datetime, timedelta

from httpx import ASGITransport, AsyncClient
from sqlalchemy import update

from app.main import app
from app.models import Ticket

API = "/api/v1"


async def make_card(admin_client, name, problem, publish=True):
    created = await admin_client.post(
        f"{API}/admin/karty",
        json={"nazwa": name, "problem": problem, "kategorie": ["dla-seniorow"]},
    )
    slug = created.json()["slug"]
    if publish:
        await admin_client.patch(f"{API}/admin/karty/{slug}", json={"status": "opublikowana"})
    return slug


async def submit(client, text, **extra):
    response = await client.post(f"{API}/zgloszenia", json={"tresc": text, **extra})
    assert response.status_code == 201
    return response.json()["token_watku"]


async def first_ticket_id(admin_client):
    listing = await admin_client.get(f"{API}/admin/zgloszenia?sort=najnowsze")
    return listing.json()["items"][0]["id"]


async def test_zlota_sciezka_zgloszenie_triaz_odpowiedz(admin_client, ai_enabled):
    slug = await make_card(
        admin_client, "Kody QR dla seniorów", "Seniorzy z demencją zapominają o lekach i kluczach"
    )
    token = await submit(
        admin_client,
        "Mama ma demencję i zapomina o lekach i kluczach, szukam pomocy",
        autor_email="ewa@example.test",
    )
    ticket_id = await first_ticket_id(admin_client)

    ai_enabled.json_response = {
        "kategoria": "dla-seniorow",
        "pilnosc": "wysoka",
        "pilnosc_uzasadnienie": "Ryzyko pominięcia leków.",
        "uzyte_karty": [slug, "wymyslona-karta"],
        "szkic_odpowiedzi": "Dzień dobry,\nPolecamy kartę Kody QR dla seniorów.\nZespół ROPS",
    }
    triaged = (await admin_client.post(f"{API}/admin/zgloszenia/{ticket_id}/triaz")).json()
    assert triaged["triaz_zrodlo"] == "ai"
    assert triaged["pilnosc"] == "wysoka"
    assert [c["slug"] for c in triaged["proponowane_karty"] if c["uzyta"]] == [slug]
    assert "Źródła (baza innowacji ROPS)" in triaged["szkic_odpowiedzi"]
    assert "wymyslona-karta" not in triaged["szkic_odpowiedzi"]

    # Nic nie trafia do autora przed zatwierdzeniem
    thread = (await admin_client.get(f"{API}/zgloszenia/watek/{token}")).json()
    assert [m["autor_rola"] for m in thread["wiadomosci"]] == ["uzytkownik"]
    assert thread["status"] == "nowe"

    approved = await admin_client.post(
        f"{API}/admin/zgloszenia/{ticket_id}/odpowiedz",
        json={"tresc": "Dzień dobry, zobacz kartę.", "zrodla": [slug]},
    )
    assert approved.json()["status"] == "odpowiedziane"
    thread = (await admin_client.get(f"{API}/zgloszenia/watek/{token}")).json()
    assert [m["autor_rola"] for m in thread["wiadomosci"]] == ["uzytkownik", "admin"]
    assert thread["wiadomosci"][1]["zrodla"][0]["slug"] == slug
    assert thread["status"] == "odpowiedziane"


async def test_triaz_bez_ai_dziala_na_regulach(admin_client):
    slug = await make_card(admin_client, "Dowóz posiłków", "Samotni seniorzy bez obiadu")
    await submit(admin_client, "Pilne: samotny senior nie ma obiadów i jedzenia")
    ticket_id = await first_ticket_id(admin_client)
    result = (await admin_client.post(f"{API}/admin/zgloszenia/{ticket_id}/triaz")).json()
    assert result["triaz_zrodlo"] == "reguly"
    assert result["pilnosc"] == "wysoka"
    assert result["triaz_komunikat"]
    assert result["szkic_odpowiedzi"].startswith("Dzień dobry")
    assert slug in [c["slug"] for c in result["proponowane_karty"]]


async def test_awaria_llm_nie_psuje_triazu(admin_client, ai_enabled):
    from app.services.llm import LLMError

    await submit(admin_client, "Potrzebujemy transportu dla osób starszych na wsi")
    ai_enabled.json_response = LLMError("Model nie odpowiedział na czas")
    ticket_id = await first_ticket_id(admin_client)
    result = await admin_client.post(f"{API}/admin/zgloszenia/{ticket_id}/triaz")
    assert result.status_code == 200
    body = result.json()
    assert body["triaz_zrodlo"] == "reguly"
    assert "ręcznie" in body["triaz_komunikat"] or "reguł" in body["triaz_komunikat"]


async def test_duplikaty_wykrywane_po_podobienstwie_tekstu(admin_client):
    await submit(admin_client, "Brak autobusu do przychodni dla seniorów w naszej wsi")
    await submit(admin_client, "Brak autobusu do przychodni dla seniorów w naszej wsi, prosimy")
    await submit(admin_client, "Szukamy pomysłu na zajęcia dla młodzieży z uzależnieniami")
    items = (await admin_client.get(f"{API}/admin/zgloszenia?sort=najnowsze")).json()["items"]
    ids = [i["id"] for i in items]  # najnowsze pierwsze: 3, 2, 1
    for ticket_id in reversed(ids):
        await admin_client.post(f"{API}/admin/zgloszenia/{ticket_id}/triaz")
    second = (await admin_client.get(f"{API}/admin/zgloszenia/{ids[1]}")).json()
    assert [d["id"] for d in second["duplikaty"]] == [ids[2]]
    unrelated = (await admin_client.get(f"{API}/admin/zgloszenia/{ids[0]}")).json()
    assert unrelated["duplikaty"] == []


async def test_powiadomienia_i_licznik(admin_client):
    await submit(admin_client, "Pierwsze zgłoszenie testowe do skrzynki")
    await submit(admin_client, "Drugie zgłoszenie testowe do skrzynki")
    data = (await admin_client.get(f"{API}/admin/powiadomienia")).json()
    assert data["nieprzeczytane"] == 2
    await admin_client.post(
        f"{API}/admin/powiadomienia/przeczytaj", json={"ids": [data["items"][0]["id"]]}
    )
    assert (await admin_client.get(f"{API}/admin/powiadomienia")).json()["nieprzeczytane"] == 1
    await admin_client.post(f"{API}/admin/powiadomienia/przeczytaj", json={})
    assert (await admin_client.get(f"{API}/admin/powiadomienia")).json()["nieprzeczytane"] == 0


async def test_przeterminowanie_wzgledem_sla(admin_client, session_factory):
    await submit(admin_client, "Stare zgłoszenie które czeka za długo na odpowiedź")
    await submit(admin_client, "Świeże zgłoszenie które dopiero wpłynęło do skrzynki")
    async with session_factory() as session:
        await session.execute(
            update(Ticket)
            .where(Ticket.id == 1)
            .values(created_at=datetime.now(UTC) - timedelta(hours=100))
        )
        await session.commit()
    items = {
        i["id"]: i for i in (await admin_client.get(f"{API}/admin/zgloszenia")).json()["items"]
    }
    assert items[1]["sla"]["przeterminowane"] is True
    assert items[2]["sla"]["przeterminowane"] is False
    # sortowanie po czasie oczekiwania: najstarsze pierwsze
    by_time = (await admin_client.get(f"{API}/admin/zgloszenia?sort=czas")).json()["items"]
    assert by_time[0]["id"] == 1
    await admin_client.put(f"{API}/admin/ustawienia", json={"sla_godziny": 200})
    items = (await admin_client.get(f"{API}/admin/zgloszenia")).json()["items"]
    assert not any(i["sla"]["przeterminowane"] for i in items)


async def test_zgloszenia_wymagaja_tokenu_dla_admina(admin_client):
    await submit(admin_client, "Zgłoszenie do sprawdzenia autoryzacji w panelu")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as anon:
        for path in ("/admin/zgloszenia", "/admin/zgloszenia/1", "/admin/powiadomienia"):
            assert (await anon.get(f"{API}{path}")).status_code == 401
        assert (
            await anon.post(f"{API}/admin/zgloszenia/1/odpowiedz", json={"tresc": "x"})
        ).status_code == 401
    assert (await admin_client.get(f"{API}/zgloszenia/watek/nie-ma")).status_code == 404


async def test_walidacja_zgloszenia(admin_client):
    too_short = await admin_client.post(f"{API}/zgloszenia", json={"tresc": "krótko"})
    assert too_short.status_code == 422
    bad_email = await admin_client.post(
        f"{API}/zgloszenia", json={"tresc": "Wystarczająco długi opis problemu", "autor_email": "x"}
    )
    assert bad_email.status_code == 422


async def import_real_cards(session_factory):
    from app.core.config import settings
    from app.services.cards import CardService

    async with session_factory() as session:
        service = CardService(session)
        await service.import_from_files(settings.innovations_path)
        await service.refresh_snapshot()


async def stored_tags(session_factory, ticket_id):
    async with session_factory() as session:
        return (await session.get(Ticket, ticket_id)).tagi


async def test_triaz_dopasowuje_karty_po_tagach_z_powodami(admin_client, session_factory):
    await import_real_cards(session_factory)
    await submit(admin_client, "Seniorzy w naszej wsi są samotni i odcięci od ludzi")
    ticket_id = await first_ticket_id(admin_client)
    body = (await admin_client.post(f"{API}/admin/zgloszenia/{ticket_id}/triaz")).json()

    best = body["proponowane_karty"][0]
    assert best["score"] > 0.5
    assert "Samotność" in best["powody"]
    tags = await stored_tags(session_factory, ticket_id)
    assert tags["problemy"] == ["samotnosc"]
    assert "seniorzy" in tags["grupy_docelowe"]


async def test_tagi_ai_sa_walidowane_ze_slownikiem(admin_client, ai_enabled, session_factory):
    await submit(admin_client, "Chcemy festiwal latawców nad jeziorem")
    ticket_id = await first_ticket_id(admin_client)
    ai_enabled.json_response = {
        "kategoria": None,
        "pilnosc": "niska",
        "uzyte_karty": [],
        "szkic_odpowiedzi": "Dzień dobry, dziękujemy.",
        "tagi": {"problemy": ["samotnosc", "wymyslony-slug"], "miejsca": "nie lista"},
    }
    await admin_client.post(f"{API}/admin/zgloszenia/{ticket_id}/triaz")
    assert await stored_tags(session_factory, ticket_id) == {"problemy": ["samotnosc"]}
    assert "<SLOWNIK>" in ai_enabled.json_calls[-1]["user"]


async def test_triaz_bez_slow_ze_slownika_zostawia_puste_tagi(admin_client, session_factory):
    await submit(admin_client, "Chcemy festiwal latawców nad jeziorem")
    ticket_id = await first_ticket_id(admin_client)
    await admin_client.post(f"{API}/admin/zgloszenia/{ticket_id}/triaz")
    assert await stored_tags(session_factory, ticket_id) == {}
