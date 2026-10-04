from app.api.deps import get_knowledge_service
from app.core.config import DEFAULT_ASSETS_PATH, DEFAULT_INNOVATIONS_PATH
from app.main import app
from app.repositories.document import DocumentRepository
from app.repositories.innovation import VOCABULARY_FILE, InnovationRepository
from app.services.knowledge import KnowledgeService


async def test_wspolne_szukanie_dokumenty_i_karty(client):
    service = KnowledgeService(
        DocumentRepository(DEFAULT_ASSETS_PATH),
        InnovationRepository(DEFAULT_INNOVATIONS_PATH),
        DEFAULT_INNOVATIONS_PATH.parent / VOCABULARY_FILE,
    )
    app.dependency_overrides[get_knowledge_service] = lambda: service
    try:
        response = await client.get("/api/v1/search", params={"q": "demencja", "limit": 5})
    finally:
        app.dependency_overrides.pop(get_knowledge_service, None)
    assert response.status_code == 200
    data = response.json()
    assert 0 < len(data["dokumenty"]) <= 5
    assert 0 < len(data["innowacje"]) <= 5
    assert all(h["innowacja"]["slug"] for h in data["innowacje"])


async def test_synonim_ze_slownika_znajduje_karty(client):
    """„osoby starsze” to alias „seniorów”: karta z samym słowem „senior” też się znajdzie."""
    repo = InnovationRepository(DEFAULT_INNOVATIONS_PATH)
    service = KnowledgeService(
        DocumentRepository(DEFAULT_ASSETS_PATH),
        repo,
        DEFAULT_INNOVATIONS_PATH.parent / VOCABULARY_FILE,
    )
    direct = {c.slug for c, _ in repo.search("osoby starsze", 50)}
    merged = {h.innowacja.slug for h in service.search_all("osoby starsze", 50).innowacje}
    assert direct < merged


async def test_walidacja_zapytania(client):
    assert (await client.get("/api/v1/search")).status_code == 422
    assert (await client.get("/api/v1/search?q=a")).status_code == 422
    assert (await client.get("/api/v1/search?q=" + "x" * 201)).status_code == 422
    assert (await client.get("/api/v1/search?q=senior&limit=0")).status_code == 422
