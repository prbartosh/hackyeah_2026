"""Szukanie po znaczeniu (ADR 0016) z atrapą modelu: wektor to grupy słów o jednym sensie."""

import json
from pathlib import Path

import numpy as np

from app.repositories.document import DocumentRepository
from app.services.knowledge import KnowledgeService
from app.services.semantic import SemanticIndex, chunk_document, is_prose

# Każda grupa to jedno „znaczenie”; słowa z różnych grup są do siebie niepodobne.
SENSES = [
    ("przemoc", "bije", "krzywdz", "agresj"),
    ("senior", "starsz", "babci", "emeryt"),
    ("ubost", "bieda", "opał", "ogrzew"),
]


class FakeEmbedder:
    model = "atrapa-v1"

    def __init__(self) -> None:
        self.calls = 0

    def embed(self, texts: list[str]) -> np.ndarray:
        self.calls += 1
        rows = []
        for text in texts:
            low = text.lower()
            vec = np.array(
                [float(any(w in low for w in sense)) for sense in SENSES] + [0.01], dtype=np.float32
            )
            rows.append(vec / np.linalg.norm(vec))
        return np.stack(rows)


RAPORT = {
    "id": "1",
    "year": 2024,
    "title": "Raport o rodzinie",
    "description": "",
    "info": "",
    "url": "https://rops.krakow.pl/1",
    "file": "assets/raporty/files/1.pdf",
    "text": "assets/raporty/text/1.md",
    "pages": 3,
    "licencja": None,
}
TRESC = (
    "<!-- page 1 -->\nSpis treści\nPRZEMOC W RODZINIE .......... 2\n"
    "<!-- page 2 -->\n"
    + "Przemoc w rodzinie dotyka wiele osób i często jest ukrywana. " * 12
    + "\n<!-- page 3 -->\n"
    + "Seniorzy mieszkający samotnie potrzebują wsparcia sąsiadów. " * 12
)


def write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False)
    path.write_text(text, encoding="utf-8")


def assets(tmp_path: Path) -> Path:
    write(tmp_path / "raporty" / "metadata.json", [RAPORT])
    write(tmp_path / "raporty" / "text" / "1.md", TRESC)
    return tmp_path


def test_fragmenty_w_granicach_strony_bez_spisu_tresci(tmp_path):
    repo = DocumentRepository(assets(tmp_path))
    [(document, body)] = repo.texts()
    chunks = chunk_document(document, body)
    assert {c.page for c in chunks} == {2, 3}  # strona 1 to sam spis treści
    assert all("......" not in c.text for c in chunks)
    assert all(len(c.text) < 1000 for c in chunks)


def test_dokument_bez_tresci_to_jeden_fragment_z_opisu(tmp_path):
    repo = DocumentRepository(assets(tmp_path))
    [(document, _)] = repo.texts()
    [chunk] = chunk_document(document, "")
    assert chunk.page is None and chunk.text.startswith("Raport o rodzinie")


def test_szukanie_po_znaczeniu_i_cache_wektorow(tmp_path):
    repo = DocumentRepository(assets(tmp_path / "assets"))
    embedder = FakeEmbedder()
    index = SemanticIndex(embedder, tmp_path / "cache")
    index.build(repo.texts())
    # „bije” nie występuje w tekście, ale ma ten sam sens co „przemoc”: trafia stronę 2.
    [hit] = index.search_documents("mąż bije żonę", 5)
    assert hit.document.id == "raport-1" and hit.page == 2
    assert index.search_documents("pogoda na jutro", 5) == []  # brak podobnego sensu
    assert index.search_documents("AI", 5) == []  # same krótkie skróty: tylko po słowach

    again = SemanticIndex(embedder, tmp_path / "cache")
    calls = embedder.calls
    again.build(repo.texts())
    assert embedder.calls == calls  # wektory z pliku, bez liczenia od nowa


def test_wspolne_szukanie_laczy_slowa_i_znaczenie(tmp_path):
    repo = DocumentRepository(assets(tmp_path / "assets"))
    index = SemanticIndex(FakeEmbedder(), tmp_path / "cache")
    index.build(repo.texts())
    service = KnowledgeService(repo, semantic=index)

    [hit] = service.search_all("babcia", 5).dokumenty  # słowa nie ma w tekście
    assert hit.po_znaczeniu and hit.strona == 3
    assert hit.fragment.startswith("Seniorzy mieszkający")

    [hit] = service.search_all("przemoc", 5).dokumenty  # słowo w tekście: zwykłe trafienie
    assert not hit.po_znaczeniu and hit.trafienia


def test_bez_indeksu_szukanie_samymi_slowami(tmp_path):
    repo = DocumentRepository(assets(tmp_path))
    service = KnowledgeService(repo, semantic=SemanticIndex(FakeEmbedder(), tmp_path / "c"))
    # Indeks nie zbudowany (liczy się w tle): wyniki tylko po słowach.
    assert service.search_all("babcia", 5).dokumenty == []
    assert [h.dokument.id for h in service.search_all("przemoc", 5).dokumenty] == ["raport-1"]


def test_tabele_i_krzaczki_z_pdf_nie_sa_fragmentami():
    assert is_prose("Seniorzy mieszkający samotnie potrzebują wsparcia sąsiadów.")
    assert not is_prose("68% 69% 67% 63% 59% 78% 78% 81% 75% 68% 71% 73% 70% 32% 62% 55%")
    assert not is_prose(r"3DWU\FMą$QWRV] &HQWUXP(ZDOXDFMLL$QDOL]SROLW\N3XEOLF]Q\FK8")


def test_podobienstwo_do_kazdej_karty(tmp_path):
    index = SemanticIndex(FakeEmbedder(), tmp_path)
    cards = {"telefon-zaufania": "Wsparcie dla osób doświadczających przemocy", "obiady": "Bieda"}
    scores = index.similarities("mąż bije żonę", cards)
    assert scores["telefon-zaufania"] > 0.9 > scores["obiady"]


def test_indeks_z_pliku_w_repo_bez_liczenia(tmp_path):
    repo = DocumentRepository(assets(tmp_path / "assets"))
    embedder = FakeEmbedder()
    built = SemanticIndex(embedder, tmp_path / "repo").build(repo.texts())
    calls = embedder.calls
    index = SemanticIndex(embedder, tmp_path / "cache", bundled_dir=tmp_path / "repo")
    assert index.build(repo.texts()) == built
    assert embedder.calls == calls and not (tmp_path / "cache").exists()


def test_grupy_radaru_po_znaczeniu(tmp_path):
    from app.models import Ticket
    from app.services.radar import group_tickets

    index = SemanticIndex(FakeEmbedder(), tmp_path)
    tickets = [
        Ticket(id=1, tresc="Sąsiad bije dzieci", tagi={}),
        Ticket(id=2, tresc="Widzę agresję w rodzinie obok", tagi={}),
        Ticket(id=3, tresc="Babcia jest samotna", tagi={}),
    ]
    groups = group_tickets(tickets, 0.55, {}, lambda t: [v.tolist() for v in index.vectors(t)])
    assert sorted(g.ids for g in groups) == [[1, 2], [3]]  # bez wspólnych słów, ten sam sens
