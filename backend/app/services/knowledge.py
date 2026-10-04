from __future__ import annotations

from pathlib import Path

from app.repositories.document import DocumentRepository
from app.repositories.innovation import InnovationRepository
from app.schemas.document import (
    Document,
    DocumentDetail,
    DocumentSearchHit,
    DocumentType,
    InnovationSearchHit,
    SearchResults,
)
from app.services.matching import load_vocabulary, synonym_queries

# Trafienie przez synonim ze słownika liczy się słabiej niż to samo słowo wpisane przez użytkownika.
SYNONYM_FACTOR = 0.7


def _merge[T](runs: list[tuple[float, list[tuple[str, T, float]]]], limit: int) -> list[T]:
    """Łączy wyniki kilku zapytań (czynnik, [(klucz, element, wynik)]): najlepszy wynik na klucz."""
    best: dict[str, tuple[float, T]] = {}
    for factor, items in runs:
        for key, item, score in items:
            scaled = score * factor
            if key not in best or scaled > best[key][0]:
                best[key] = (scaled, item)
    ordered = sorted(best.values(), key=lambda pair: -pair[0])
    return [item for _, item in ordered[:limit]]


class KnowledgeService:
    """Dokumenty Zasobnika wiedzy. Nazwa inna niż `documents.py` (import dokumentów do kart)."""

    def __init__(
        self,
        repo: DocumentRepository,
        innovations: InnovationRepository | None = None,
        vocabulary_path: Path | None = None,
    ) -> None:
        self.repo = repo
        self.innovations = innovations
        self.vocabulary = load_vocabulary(vocabulary_path) if vocabulary_path else {}

    def list(self, typ: DocumentType | None, rok: int | None, q: str | None) -> list[Document]:
        return self.repo.list(typ=typ, rok=rok, q=q)

    def get(self, doc_id: str) -> DocumentDetail | None:
        return self.repo.get(doc_id)

    def search(self, q: str, limit: int) -> list[DocumentSearchHit]:
        queries = [(1.0, q), *((SYNONYM_FACTOR, a) for a in synonym_queries(q, self.vocabulary))]
        runs = [
            (
                factor,
                [(h.document.id, h, h.score) for h in self.repo.search(query, limit)],
            )
            for factor, query in queries
        ]
        return [
            DocumentSearchHit(
                dokument=h.document, fragment=h.fragment, trafienia=h.highlights, strona=h.strona
            )
            for h in _merge(runs, limit)
        ]

    def search_all(self, q: str, limit: int) -> SearchResults:
        """Dokumenty (raporty, publikacje, canvas, Mapa Wyzwań, wskaźniki) i karty innowacji."""
        cards: list[InnovationSearchHit] = []
        if self.innovations is not None:
            queries = [
                (1.0, q),
                *((SYNONYM_FACTOR, a) for a in synonym_queries(q, self.vocabulary)),
            ]
            runs = [
                (factor, [(c.slug, c, s) for c, s in self.innovations.search(query, limit)])
                for factor, query in queries
            ]
            cards = [InnovationSearchHit(innowacja=c) for c in _merge(runs, limit)]
        return SearchResults(dokumenty=self.search(q, limit), innowacje=cards)
