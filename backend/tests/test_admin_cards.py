from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app
from app.repositories.innovation import InnovationRepository
from app.services.ai import AIGateway
from app.services.cards import CardService


async def import_cards(session_factory, tmp_innovations):
    async with session_factory() as session:
        service = CardService(session, AIGateway(session, settings, None))
        return await service.import_from_files(tmp_innovations)


async def test_admin_wymaga_tokenu(admin_client):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as anon:
        assert (await anon.get("/api/v1/admin/karty")).status_code == 401
        bad = await anon.get("/api/v1/admin/karty", headers={"Authorization": "Bearer zly"})
        assert bad.status_code == 401
    assert (await admin_client.get("/api/v1/admin/karty")).status_code == 200


async def test_panel_wylaczony_bez_tokenu(admin_client, monkeypatch):
    monkeypatch.setattr(settings, "admin_token", None)
    response = await admin_client.get("/api/v1/admin/karty")
    assert response.status_code == 503


async def test_nowa_karta_dostaje_embedding_i_slug(admin_client):
    created = await admin_client.post(
        "/api/v1/admin/karty",
        json={"nazwa": "Żółta łódź", "problem": "Samotność seniorów na wsi zimą"},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["slug"] == "zolta-lodz"
    assert body["status"] == "szkic"
    assert body["ma_embedding"] is True
    assert body["ostrzezenie"] is None  # wektory lokalne to tryb normalny, nie awaria


async def test_publikacja_wymaga_problemu(admin_client):
    await admin_client.post("/api/v1/admin/karty", json={"nazwa": "Pusta karta"})
    response = await admin_client.patch(
        "/api/v1/admin/karty/pusta-karta", json={"status": "opublikowana"}
    )
    assert response.status_code == 422


async def test_opublikowana_karta_widoczna_w_matchmakingu(admin_client):
    await admin_client.post(
        "/api/v1/admin/karty",
        json={"nazwa": "Wioska bez barier", "problem": "Brak transportu dla seniorów"},
    )
    path = settings.innovations_path
    assert InnovationRepository(path).get("wioska-bez-barier") is None

    await admin_client.patch(
        "/api/v1/admin/karty/wioska-bez-barier", json={"status": "opublikowana"}
    )
    card = InnovationRepository(path).get("wioska-bez-barier")
    assert card is not None
    assert card.nazwa == "Wioska bez barier"

    await admin_client.patch(
        "/api/v1/admin/karty/wioska-bez-barier", json={"status": "zarchiwizowana"}
    )
    assert InnovationRepository(path).get("wioska-bez-barier") is None


async def test_zmiana_tresci_przelicza_embedding(admin_client):
    created = await admin_client.post(
        "/api/v1/admin/karty", json={"nazwa": "Karta A", "problem": "Opis jeden"}
    )
    slug = created.json()["slug"]
    await admin_client.patch(f"/api/v1/admin/karty/{slug}", json={"problem": "Całkiem inny"})
    reindexed = await admin_client.post("/api/v1/admin/reindeksuj")
    assert reindexed.json()["karty"] == 1


async def test_import_z_plikow_i_lista_ze_statusami(admin_client, session_factory):
    imported = await import_cards(session_factory, settings.innovations_path)
    assert imported > 100
    assert await import_cards(session_factory, settings.innovations_path) == 0
    listing = await admin_client.get("/api/v1/admin/karty?status=opublikowana&limit=10")
    assert listing.json()["total"] == imported
    assert len(listing.json()["items"]) == 10
