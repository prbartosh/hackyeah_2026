import json
from pathlib import Path

import pytest

from app.api.deps import get_document_repository
from app.core.config import DEFAULT_ASSETS_PATH
from app.main import app
from app.repositories.document import DocumentRepository
from app.repositories.document_search import fold

RAPORT = {
    "id": "100",
    "year": 2024,
    "title": "Piecza zastępcza w Małopolsce",
    "description": "Raport o rodzinach zastępczych.",
    "info": "Typ: PDF . Rozmiar: 1.5 MB",
    "url": "https://rops.krakow.pl/raport-100",
    "file": "assets/raporty/files/100.pdf",
    "text": "assets/raporty/text/100-piecza.md",
    "pages": 40,
    "licencja": "CC BY 4.0",
}
STARY_RAPORT = RAPORT | {
    "id": "50",
    "year": 2013,
    "title": "Przemoc w rodzinie",
    "description": "",
    "text": "assets/raporty/text/brak.md",
    "licencja": None,
}
PUBLIKACJA = {
    "title": "Połącz kropki",
    "url": "https://rops.krakow.pl/kropki.pdf",
    "file": "assets/publikacje/files/kropki.pdf",
    "text": "assets/publikacje/text/kropki.md",
    "pages": 29,
    "year": 2023,
    "description": "Innowacje społeczne z inkubatora.",
}
MAPA = {
    "title": "Mapa Wyzwań Społecznych",
    "url": "https://rops.krakow.pl/mapa.pdf",
    "file": "assets/mapa-wyzwan/files/mapa.pdf",
    "text": "assets/mapa-wyzwan/text/mapa.md",
    "pages": 44,
}
WSKAZNIK = {
    "id": "186",
    "name": "Ludność ogółem",
    "category": "LUDNOŚĆ",
    "years": ["2024"],
    "description": {"Nazwa wskaźnika": "Ludność ogółem", "Źródło": "GUS", "Opis": "Liczba osób."},
}


def write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False)
    path.write_text(text, encoding="utf-8")


@pytest.fixture
async def docs_client(client, tmp_path):
    write(tmp_path / "raporty" / "metadata.json", [STARY_RAPORT, RAPORT])
    write(tmp_path / "raporty" / "text" / "100-piecza.md", "<!-- page 1 -->\nTreść raportu")
    write(tmp_path / "publikacje" / "metadata.json", [PUBLIKACJA])
    write(tmp_path / "publikacje" / "text" / "kropki.md", "Treść publikacji")
    write(tmp_path / "mapa-wyzwan" / "metadata.json", [MAPA])
    write(tmp_path / "obserwator" / "indicators.json", [WSKAZNIK])
    write(tmp_path / "obserwator" / "text" / "186-ludnosc-ogolem.md", "# Ludność ogółem")
    repo = DocumentRepository(tmp_path)
    app.dependency_overrides[get_document_repository] = lambda: repo
    yield client
    app.dependency_overrides.pop(get_document_repository, None)


async def ids(client, **params) -> list[str]:
    response = await client.get("/api/v1/documents", params=params)
    assert response.status_code == 200, response.text
    return [d["id"] for d in response.json()]


async def test_list_all_in_order(docs_client):
    assert await ids(docs_client) == [
        "mapa-wyzwan-mapa",
        "publikacja-kropki",
        "raport-100",
        "raport-50",
        "wskaznik-186",
    ]


async def test_list_has_no_content(docs_client):
    response = await docs_client.get("/api/v1/documents")
    assert all("tresc" not in d for d in response.json())


async def test_filters(docs_client):
    assert await ids(docs_client, typ="raport") == ["raport-100", "raport-50"]
    assert await ids(docs_client, rok=2023) == ["publikacja-kropki"]
    assert await ids(docs_client, typ="raport", rok=2013) == ["raport-50"]
    # bez polskich znaków, odmiana, opis też się liczy
    assert await ids(docs_client, q="zastepcza malopolsce") == ["raport-100"]
    assert await ids(docs_client, q="inkubatora") == ["publikacja-kropki"]
    assert await ids(docs_client, q="ludnosc") == ["wskaznik-186"]
    assert await ids(docs_client, q="nie ma takiego") == []


async def test_invalid_filters(docs_client):
    assert (await docs_client.get("/api/v1/documents?typ=film")).status_code == 422
    assert (await docs_client.get("/api/v1/documents?rok=abc")).status_code == 422
    assert (await docs_client.get("/api/v1/documents?q=" + "x" * 201)).status_code == 422


async def test_report_detail(docs_client):
    response = await docs_client.get("/api/v1/documents/raport-100")
    assert response.status_code == 200
    assert response.json() == {
        "id": "raport-100",
        "typ": "raport",
        "tytul": "Piecza zastępcza w Małopolsce",
        "opis": "Raport o rodzinach zastępczych.",
        "rok": 2024,
        "url_zrodlowy": "https://rops.krakow.pl/raport-100",
        "licencja": "CC BY 4.0",
        "strony": 40,
        "rozmiar": "1.5 MB",
        "kategoria": None,
        "zrodlo_danych": None,
        "tresc": "<!-- page 1 -->\nTreść raportu",
    }


async def test_missing_fields_are_null(docs_client):
    raport = (await docs_client.get("/api/v1/documents/raport-50")).json()
    assert raport["opis"] is None
    assert raport["licencja"] is None
    assert raport["tresc"] is None  # brak pliku z tekstem

    mapa = (await docs_client.get("/api/v1/documents/mapa-wyzwan-mapa")).json()
    assert mapa["rok"] is None
    assert mapa["rozmiar"] is None


async def test_indicator_detail(docs_client):
    data = (await docs_client.get("/api/v1/documents/wskaznik-186")).json()
    assert data["typ"] == "wskaznik"
    assert data["kategoria"] == "LUDNOŚĆ"
    assert data["zrodlo_danych"] == "GUS"
    assert data["opis"] == "Liczba osób."
    assert data["url_zrodlowy"] == "https://obserwator.rops.krakow.pl/"
    assert data["tresc"] == "# Ludność ogółem"


async def test_unknown_document(docs_client):
    assert (await docs_client.get("/api/v1/documents/raport-999")).status_code == 404


async def test_real_assets_load():
    repo = DocumentRepository(DEFAULT_ASSETS_PATH)
    documents = repo.list()
    counts = {t: sum(d.typ == t for d in documents) for t in ("raport", "publikacja", "wskaznik")}
    assert counts == {"raport": 51, "publikacja": 3, "wskaznik": 184}
    assert len({d.id for d in documents}) == len(documents)
    # licencja tylko tam, gdzie ROPS ją podaje (zadanie 0014)
    assert {d.id for d in documents if d.licencja} == {
        "raport-1479",
        "raport-1348",
        "raport-1310",
        "raport-1257",
        "raport-1105",
    }
    assert repo.get("raport-1479").tresc


async def test_search_in_content_without_diacritics(docs_client, tmp_path):
    write(
        tmp_path / "raporty" / "text" / "100-piecza.md",
        "<!-- page 1 -->\nWstęp\n<!-- page 2 -->\n"
        + "Tło. " * 40
        + "Pomoc społeczna dla rodzin jest kluczowa w gminach.",
    )
    repo = DocumentRepository(tmp_path)
    app.dependency_overrides[get_document_repository] = lambda: repo
    response = await docs_client.get("/api/v1/documents/search", params={"q": "POMOC spoleczna"})
    assert response.status_code == 200
    (hit,) = response.json()
    assert hit["dokument"]["id"] == "raport-100"
    assert hit["strona"] == 2
    fragment = hit["fragment"]
    assert "<!--" not in fragment
    assert [fragment[s:e] for s, e in hit["trafienia"]] == ["Pomoc", "społeczna"]


async def test_search_title_only_and_ranking(docs_client):
    hits = (await docs_client.get("/api/v1/documents/search?q=piecza")).json()
    assert [h["dokument"]["id"] for h in hits] == ["raport-100"]
    assert hits[0]["fragment"] is None  # treść raportu nie zawiera słowa
    hits = (await docs_client.get("/api/v1/documents/search?q=tresc")).json()
    assert {h["dokument"]["id"] for h in hits} == {"raport-100", "publikacja-kropki"}
    assert (await docs_client.get("/api/v1/documents/search?q=nic+takiego")).json() == []


async def test_search_limits(docs_client):
    assert (await docs_client.get("/api/v1/documents/search")).status_code == 422
    assert (await docs_client.get("/api/v1/documents/search?q=a")).status_code == 422
    assert (await docs_client.get("/api/v1/documents/search?q=" + "x" * 201)).status_code == 422
    assert (await docs_client.get("/api/v1/documents/search?q=tresc&limit=0")).status_code == 422
    assert len((await docs_client.get("/api/v1/documents/search?q=tresc&limit=1")).json()) == 1


async def test_search_real_assets():
    repo = DocumentRepository(DEFAULT_ASSETS_PATH)
    hits = repo.search("pomoc spoleczna", 10)
    assert hits and all(h.fragment for h in hits[:3])
    for h in hits:
        assert all(e <= len(h.fragment) for _, e in h.highlights)
    assert fold("ŁÓDŹ Żółć") == "lodz zolc"
