from __future__ import annotations

from pathlib import Path

from app.repositories.document import DocumentRepository
from app.repositories.document_search import SNIPPET_LENGTH, highlight
from app.repositories.innovation import InnovationRepository
from app.schemas.document import (
    Document,
    DocumentDetail,
    DocumentSearchHit,
    DocumentType,
    InnovationSearchHit,
    SearchResults,
)
from app.schemas.innovation import Innovation
from app.services.matching import load_vocabulary, synonym_queries
from app.services.semantic import SemanticHit, SemanticIndex, card_text

# Trafienie przez synonim ze słownika liczy się słabiej niż to samo słowo wpisane przez użytkownika.
SYNONYM_FACTOR = 0.7
# Reciprocal Rank Fusion: wynik = suma 1 / (RRF_K + miejsce) z obu list (słowa i znaczenie).
RRF_K = 60


def _merge[T](runs: list[tuple[float, list[tuple[str, T, float]]]], limit: int) -> list[T]:
    """Łączy wyniki kilku zapytań (czynnik, [(klucz, element, wynik)]): najlepszy wynik na klucz.

    Wyniki BM25 różnych zapytań nie są porównywalne (dłuższa fraza zbiera więcej punktów), więc
    każde zapytanie liczymy względem jego najlepszego trafienia: oryginał ma na górze 1,0,
    synonim najwyżej swój czynnik.
    """
    best: dict[str, tuple[float, T]] = {}
    for factor, items in runs:
        top = max((score for _, _, score in items), default=0.0) or 1.0
        for key, item, score in items:
            scaled = score / top * factor
            if key not in best or scaled > best[key][0]:
                best[key] = (scaled, item)
    ordered = sorted(best.values(), key=lambda pair: -pair[0])
    return [item for _, item in ordered[:limit]]


def _fuse(*rankings: list[str]) -> list[str]:
    """Jedna kolejność z kilku list kluczy (Reciprocal Rank Fusion); remis: pierwsza lista."""
    scores: dict[str, float] = {}
    for ranking in rankings:
        for position, key in enumerate(ranking, start=1):
            scores[key] = scores.get(key, 0.0) + 1 / (RRF_K + position)
    return sorted(scores, key=lambda key: -scores[key])


def _semantic_hit(hit: SemanticHit, q: str) -> DocumentSearchHit:
    fragment = hit.text
    if len(fragment) > SNIPPET_LENGTH:
        fragment = fragment[:SNIPPET_LENGTH].rsplit(" ", 1)[0] + "…"
    return DocumentSearchHit(
        dokument=hit.document,
        fragment=fragment,
        trafienia=highlight(fragment, q),
        strona=hit.page,
        po_znaczeniu=True,
    )


def _card_text(card: Innovation) -> str:
    return card_text(card.nazwa, card.problem, card.grupa_docelowa, card.opis)


class KnowledgeService:
    """Dokumenty Zasobnika wiedzy. Nazwa inna niż `documents.py` (import dokumentów do kart)."""

    def __init__(
        self,
        repo: DocumentRepository,
        innovations: InnovationRepository | None = None,
        vocabulary_path: Path | None = None,
        semantic: SemanticIndex | None = None,
    ) -> None:
        self.repo = repo
        self.innovations = innovations
        self.vocabulary = load_vocabulary(vocabulary_path) if vocabulary_path else {}
        self.semantic = semantic

    def start_semantic(self) -> None:
        """Liczy wektory w tle (przy starcie aplikacji); do tego czasu szukanie samymi słowami."""
        if self.semantic is not None:
            self.semantic.start(self.repo.texts, self._card_texts)

    def _card_texts(self) -> dict[str, str]:
        cards = self.innovations.all() if self.innovations is not None else []
        return {c.slug: _card_text(c) for c in cards}

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
        """Dokumenty (raporty, publikacje, canvas, Mapa Wyzwań, wskaźniki) i karty innowacji.

        Wyniki po słowach (BM25 z synonimami) i po znaczeniu w jednej liście.
        """
        return SearchResults(dokumenty=self._documents(q, limit), innowacje=self._cards(q, limit))

    def _documents(self, q: str, limit: int) -> list[DocumentSearchHit]:
        lexical = {h.dokument.id: h for h in self.search(q, limit)}
        if self.semantic is None:
            return list(lexical.values())
        semantic = {h.document.id: h for h in self.semantic.search_documents(q, limit)}
        order = _fuse(list(lexical), list(semantic))[:limit]
        return [
            lexical[key] if key in lexical else _semantic_hit(semantic[key], q) for key in order
        ]

    def _cards(self, q: str, limit: int) -> list[InnovationSearchHit]:
        if self.innovations is None:
            return []
        queries = [(1.0, q), *((SYNONYM_FACTOR, a) for a in synonym_queries(q, self.vocabulary))]
        runs = [
            (factor, [(c.slug, c, s) for c, s in self.innovations.search(query, limit)])
            for factor, query in queries
        ]
        lexical = {c.slug: c for c in _merge(runs, limit)}
        if self.semantic is None:
            return [InnovationSearchHit(innowacja=c) for c in lexical.values()]
        semantic = self.semantic.search_cards(q, self._card_texts(), limit)
        order = _fuse(list(lexical), semantic)[:limit]
        return [
            InnovationSearchHit(innowacja=lexical[slug])
            if slug in lexical
            else InnovationSearchHit(innowacja=self.innovations.get(slug), po_znaczeniu=True)
            for slug in order
        ]
