"""Wyszukiwanie w treści dokumentów (raporty, publikacje, Mapa Wyzwań) z fragmentem i stroną.

Indeks w pamięci, budowany przy pierwszym zapytaniu (ok. 9 MB tekstu). Wskaźniki Obserwatora
(tabele powiat × rok, dziesiątki MB) przeszukujemy tylko po tytule i opisie.
Normalizacja zachowuje długość tekstu (znak za znak), więc pozycje w tekście znormalizowanym
wskazują to samo miejsce w oryginale.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from app.schemas.document import Document

MAX_TOKENS = 8
MIN_TOKEN_LEN = 2
SNIPPET_BEFORE = 90
SNIPPET_LENGTH = 260
PROXIMITY = 150
MAX_CANDIDATES = 300

_FOLD = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻİ", "acelnoszzacelnoszzi")
PAGE_RE = re.compile(r"<!--\s*page\s+(\d+)\s*-->")
MARKUP_RE = re.compile(r"<!--.*?-->|[#*_|>`]+|\.{4,}", re.DOTALL)


def fold(text: str) -> str:
    """Małe litery bez polskich znaków, ta sama długość co wejście."""
    return text.translate(_FOLD).lower()


def query_tokens(query: str) -> list[str]:
    words = re.split(r"[^a-z0-9]+", fold(query))
    return [w for w in words if len(w) >= MIN_TOKEN_LEN][:MAX_TOKENS]


def _variants(token: str) -> list[str]:
    """Te same reguły odmiany co w wyszukiwarce innowacji."""
    variants = [token]
    if len(token) >= 5 and token.endswith("ek"):
        variants.append(token[:-2] + "k")  # „wózek” -> „wózka”
    if len(token) >= 6:
        variants.append(token[:-2])  # „seniorów” -> „seniorzy”
    return variants


def find_token(text: str, token: str) -> int:
    """Pozycja pierwszego trafienia albo -1."""
    found = [i for i in (text.find(v) for v in _variants(token)) if i >= 0]
    return min(found) if found else -1


@dataclass(frozen=True)
class _Entry:
    document: Document
    meta: str  # tytuł i opis, znormalizowane
    body: str  # treść oryginalna ("" gdy brak lub wskaźnik)
    body_folded: str


@dataclass(frozen=True)
class SearchHit:
    document: Document
    fragment: str | None
    highlights: list[tuple[int, int]]  # [początek, koniec) w `fragment`
    strona: int | None


def build_index(entries: list[tuple[Document, Path | None]]) -> list[_Entry]:
    index = []
    for document, path in entries:
        body = ""
        if document.typ != "wskaznik" and path and path.exists():
            body = path.read_text(encoding="utf-8")
        meta = fold(f"{document.tytul} {document.opis or ''}")
        index.append(_Entry(document, meta, body, fold(body)))
    return index


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", MARKUP_RE.sub(" ", text)).strip()


def _highlights(fragment: str, tokens: list[str]) -> list[tuple[int, int]]:
    """Całe słowa, w których występuje szukane słowo lub jego rdzeń."""
    folded = fold(fragment)
    marks: list[list[int]] = []
    spans = []
    for token in tokens:
        for variant in _variants(token):
            for m in re.finditer(re.escape(variant), folded):
                s, e = m.start(), m.end()
                while s > 0 and folded[s - 1].isalnum():
                    s -= 1
                while e < len(folded) and folded[e].isalnum():
                    e += 1
                spans.append((s, e))
    for s, e in sorted(spans):
        if marks and s <= marks[-1][1]:
            marks[-1][1] = max(marks[-1][1], e)
        else:
            marks.append([s, e])
    return [(s, e) for s, e in marks]


def _best_position(text: str, tokens: list[str]) -> int:
    """Pierwsze miejsce, w którym wszystkie słowa są blisko siebie; inaczej pierwsze trafienie."""
    first = [p for p in (find_token(text, t) for t in tokens) if p >= 0]
    if not first:
        return -1
    if len(tokens) > 1:
        for variant in _variants(tokens[0]):
            start = text.find(variant)
            for _ in range(MAX_CANDIDATES):
                if start < 0:
                    break
                window = text[max(0, start - PROXIMITY) : start + PROXIMITY]
                if all(find_token(window, t) >= 0 for t in tokens):
                    return start
                start = text.find(variant, start + 1)
    return min(first)


def _snippet(
    entry: _Entry, tokens: list[str]
) -> tuple[str, list[tuple[int, int]], int | None] | None:
    pos = _best_position(entry.body_folded, tokens)
    if pos < 0:
        return None
    start = max(0, pos - SNIPPET_BEFORE)
    raw = entry.body[start : start + SNIPPET_LENGTH]
    if start > 0 and " " in raw[:20]:
        raw = raw.split(" ", 1)[1]  # pierwsze słowo mogło zostać ucięte w środku
    fragment = _clean(raw)
    marks = _highlights(fragment, tokens)
    prefix = "…" if start > 0 else ""
    suffix = "…" if start + SNIPPET_LENGTH < len(entry.body) else ""
    pages = list(PAGE_RE.finditer(entry.body, 0, pos))
    page = int(pages[-1][1]) if pages else None
    shifted = [(s + len(prefix), e + len(prefix)) for s, e in marks]
    return prefix + fragment + suffix, shifted, page


def search(index: list[_Entry], query: str, limit: int) -> list[SearchHit]:
    tokens = query_tokens(query)
    if not tokens:
        return []
    scored: list[tuple[int, int, _Entry]] = []
    for order, entry in enumerate(index):
        text = f"{entry.meta} {entry.body_folded}"
        if any(find_token(text, t) < 0 for t in tokens):
            continue
        # Trafienie w tytule i opisie liczy się najmocniej, potem liczba wystąpień w treści.
        score = sum(10 for t in tokens if find_token(entry.meta, t) >= 0)
        score += sum(min(entry.body_folded.count(t), 20) for t in tokens)
        scored.append((-score, order, entry))
    scored.sort(key=lambda s: s[:2])
    hits = []
    for _, _, entry in scored[:limit]:
        snippet = _snippet(entry, tokens)
        fragment, marks, page = snippet if snippet else (None, [], None)
        hits.append(SearchHit(entry.document, fragment, marks, page))
    return hits
