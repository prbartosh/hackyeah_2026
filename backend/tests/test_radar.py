from datetime import UTC, datetime, timedelta

from sqlalchemy import update

from app.models import Ticket

API = "/api/v1"


async def submit_and_triage(client, text):
    response = await client.post(f"{API}/zgloszenia", json={"tresc": text})
    assert response.status_code == 201
    items = (await client.get(f"{API}/admin/zgloszenia?sort=najnowsze")).json()["items"]
    ticket_id = items[0]["id"]
    await client.post(f"{API}/admin/zgloszenia/{ticket_id}/triaz")
    return ticket_id


async def test_radar_grupuje_zgloszenia_bez_dopasowania(admin_client):
    transport = [
        "Brakuje autobusu do przychodni dla seniorów na wsi",
        "Seniorzy na wsi nie mają autobusu do przychodni",
        "Autobus do przychodni nie jeździ, seniorzy na wsi odcięci",
    ]
    other = ["Młodzież uzależniona od telefonów potrzebuje zajęć pozaszkolnych"]
    for text in transport + other:
        await submit_and_triage(admin_client, text)

    radar = (await admin_client.get(f"{API}/admin/radar")).json()
    assert radar["bez_dopasowania"] == 4  # baza kart jest pusta, więc nic nie pasuje
    sizes = sorted(c["liczba"] for c in radar["klastry"])
    assert sizes == [1, 3]
    biggest = radar["klastry"][0]
    assert biggest["liczba"] == 3
    assert biggest["nazwa"].startswith("Temat:")  # bez AI nazwa ze słów
    assert len(biggest["trend"]) == 8
    assert sum(w["liczba"] for w in biggest["trend"]) == 3
    assert len(biggest["przyklady"]) == 3


async def test_zgloszenie_z_dopasowaniem_nie_trafia_do_radaru(admin_client):
    created = await admin_client.post(
        f"{API}/admin/karty",
        json={
            "nazwa": "Dowóz obiadów",
            "problem": "Samotni seniorzy bez dostępu do ciepłych posiłków obiadów",
        },
    )
    await admin_client.patch(
        f"{API}/admin/karty/{created.json()['slug']}", json={"status": "opublikowana"}
    )
    await submit_and_triage(
        admin_client, "Samotni seniorzy potrzebują ciepłych posiłków obiadów w domu"
    )
    await submit_and_triage(admin_client, "Brakuje boiska dla młodzieży w naszej gminie wiejskiej")
    radar = (await admin_client.get(f"{API}/admin/radar")).json()
    assert radar["bez_dopasowania"] == 1


async def test_nazwy_klastrow_z_ai_sa_cache_owane(admin_client, ai_enabled):
    for text in (
        "Brakuje autobusu do przychodni dla seniorów na wsi",
        "Seniorzy na wsi nie mają autobusu do przychodni",
    ):
        await submit_and_triage(admin_client, text)
    ai_enabled.json_response = {}
    first = (await admin_client.get(f"{API}/admin/radar")).json()
    key = first["klastry"][0]["klucz"]
    ai_enabled.json_response = {"nazwy": {key: "Transport do lekarza na wsi"}}
    named = (await admin_client.get(f"{API}/admin/radar")).json()
    assert named["klastry"][0]["nazwa"] == "Transport do lekarza na wsi"
    assert named["klastry"][0]["nazwa_zrodlo"] == "ai"
    calls = len(ai_enabled.json_calls)
    again = (await admin_client.get(f"{API}/admin/radar")).json()
    assert again["klastry"][0]["nazwa"] == "Transport do lekarza na wsi"
    assert len(ai_enabled.json_calls) == calls  # z cache, bez nowego wywołania


async def test_trend_rosnacy(admin_client, session_factory):
    ids = []
    for text in (
        "Brakuje autobusu do przychodni dla seniorów na wsi",
        "Seniorzy na wsi nie mają autobusu do przychodni",
        "Autobus do przychodni nie jeździ, seniorzy na wsi odcięci",
        "Przychodnia bez autobusu, seniorzy na wsi nie dojadą",
    ):
        ids.append(await submit_and_triage(admin_client, text))
    async with session_factory() as session:
        await session.execute(
            update(Ticket)
            .where(Ticket.id == ids[0])
            .values(created_at=datetime.now(UTC) - timedelta(weeks=6))
        )
        await session.commit()
    cluster = (await admin_client.get(f"{API}/admin/radar")).json()["klastry"][0]
    assert cluster["liczba"] == 4
    assert cluster["zmiana"] == "rosnący"


async def test_notatka_z_klastra(admin_client):
    first = await submit_and_triage(admin_client, "Brakuje autobusu do przychodni dla seniorów")
    second = await submit_and_triage(admin_client, "Seniorzy nie mają autobusu do przychodni")
    created = await admin_client.post(
        f"{API}/admin/radar/notatki",
        json={"tytul": "Transport dla seniorów", "zgloszenia_ids": [first, second]},
    )
    assert created.status_code == 201
    note = created.json()
    assert "autobusu" in note["tresc"]
    radar = (await admin_client.get(f"{API}/admin/radar")).json()
    assert radar["klastry"][0]["notatka_id"] == note["id"]
    done = await admin_client.patch(
        f"{API}/admin/radar/notatki/{note['id']}", json={"wykonana": True}
    )
    assert done.json()["wykonana"] is True
    assert len((await admin_client.get(f"{API}/admin/radar/notatki")).json()) == 1
    missing = await admin_client.post(
        f"{API}/admin/radar/notatki", json={"tytul": "x", "zgloszenia_ids": [999]}
    )
    assert missing.status_code == 422
