from app.api.deps import get_knowledge_service
from app.core.config import DEFAULT_ASSETS_PATH, DEFAULT_INNOVATIONS_PATH
from app.main import app
from app.repositories.document import DocumentRepository
from app.repositories.document_search import fold
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


def real_service() -> KnowledgeService:
    return KnowledgeService(
        DocumentRepository(DEFAULT_ASSETS_PATH),
        InnovationRepository(DEFAULT_INNOVATIONS_PATH),
        DEFAULT_INNOVATIONS_PATH.parent / VOCABULARY_FILE,
    )


async def test_synonim_ze_slownika_znajduje_karty():
    """„osoby starsze” to alias „seniorów”: karta z samym słowem „senior” też się znajdzie."""
    service = real_service()
    direct = {c.slug for c, _ in service.innovations.search("samotność seniorów", 50)}
    merged = {h.innowacja.slug for h in service.search_all("samotność seniorów", 50).innowacje}
    assert direct < merged


def highlighted(hit) -> list[str]:
    return [fold(hit.fragment[s:e]) for s, e in hit.trafienia]


async def test_szukanie_przemoc():
    results = real_service().search_all("Przemoc", 10)
    docs = results.dokumenty
    assert "Przemoc" in docs[0].dokument.tytul
    # Pierwsze trafienia z samego zapytania (synonimy niżej), podświetlona tylko „przemoc…”.
    for hit in docs[:3]:
        assert highlighted(hit) and all(w.startswith("przemoc") for w in highlighted(hit))
    assert all("\ufffd" not in (h.fragment or "") for h in docs)
    assert results.innowacje[0].innowacja.slug == "mobilna-pomoc-terapeutyczna"


async def test_synonim_nie_wyprzedza_zapytania():
    """„depresja młodzieży”: dłuższa fraza zastępcza nie wygrywa z dokumentem o depresji."""
    [top] = real_service().search_all("depresja młodzieży", 1).dokumenty
    assert any(w.startswith("depres") for w in highlighted(top))


async def test_walidacja_zapytania(client):
    assert (await client.get("/api/v1/search")).status_code == 422
    assert (await client.get("/api/v1/search?q=a")).status_code == 422
    assert (await client.get("/api/v1/search?q=" + "x" * 201)).status_code == 422
    assert (await client.get("/api/v1/search?q=senior&limit=0")).status_code == 422
