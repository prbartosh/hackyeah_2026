"""Wyszukiwanie w treści dokumentów (raporty, publikacje, Mapa Wyzwań) z fragmentem i stroną.

Indeks w pamięci, budowany przy pierwszym zapytaniu (ok. 9 MB tekstu). Wskaźniki Obserwatora
przeszukujemy po nazwie, kategorii, źródle i opisie; tabele powiat × rok pomijamy (same liczby).
Ranking to BM25 (rzadkie słowa ważą więcej, długi dokument nie wygrywa samą długością).
Normalizacja zachowuje długość tekstu (znak za znak), więc pozycje w tekście znormalizowanym
wskazują to samo miejsce w oryginale.
"""

from __future__ import annotations

import math
import re
from bisect import bisect_left
from collections import Counter
from dataclasses import dataclass
from functools import lru_cache
from itertools import accumulate
from pathlib import Path

from app.schemas.document import Document

MAX_TOKENS = 8
MIN_TOKEN_LEN = 2
SNIPPET_BEFORE = 90
SNIPPET_LENGTH = 260
PROXIMITY = 150
MAX_CANDIDATES = 100
# BM25: nasycenie częstości słowa i wpływ długości dokumentu.
BM25_K1 = 1.2
BM25_B = 0.75
# Trafienie w tytule i opisie liczy się tyle razy co wystąpienie w treści.
META_WEIGHT = 3.0
# Wskaźnik: od tego nagłówku zaczyna się tabela z liczbami.
TABLE_MARKER = "## Wartości według powiatów"

_FOLD = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻİ", "acelnoszzacelnoszzi")
PAGE_RE = re.compile(r"<!--\s*page\s+(\d+)\s*-->")
# \ufffd: kropki spisu treści, których ekstrakcja PDF nie odczytała.
MARKUP_RE = re.compile(r"<!--.*?-->|[#*_|>`]+|\.{4,}|\ufffd+", re.DOTALL)
WORD_RE = re.compile(r"\w+")
TOC_RE = re.compile(r"\.{4,}|\ufffd{3,}|…{3,}")


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
    if len(token) >= 8:
        variants.append(token[:-2])  # „seniorów” -> „seniorzy”
    elif len(token) >= 6:
        variants.append(token[:-1])  # „dzieci” -> „dziecko”, „przemoc” -> „przemocy”
    return variants


def _prefixes(token: str) -> list[str]:
    """Warianty bez tych, których początkiem jest inny wariant (liczyłyby się podwójnie)."""
    variants = _variants(token)
    return [v for v in variants if not any(o != v and v.startswith(o) for o in variants)]


@lru_cache(maxsize=1024)
def _pattern(token: str) -> re.Pattern[str]:
    """Słowo od początku wyrazu: „ai” nie trafia w „e-mail”, „żonę” w „położone”."""
    return re.compile(r"(?<!\w)(?:" + "|".join(map(re.escape, _prefixes(token))) + ")")


@dataclass(frozen=True)
class _Words:
    sorted: list[str]
    cumulative: list[int]  # cumulative[i] = suma wystąpień słów sorted[:i]


@lru_cache(maxsize=4096)
def _words(text: str) -> _Words:
    """Słownik słów tekstu, liczony raz: liczenie słowa to wyszukiwanie binarne po prefiksie."""
    counts = Counter(WORD_RE.findall(text))
    words = sorted(counts)
    return _Words(words, list(accumulate((counts[w] for w in words), initial=0)))


def _occurrences(text: str, token: str, limit: int) -> list[int]:
    """Pierwsze pozycje słowa od początku wyrazu. `str.find` zamiast wzorca z warunkiem
    na poprzedni znak: na kilku MB tekstu kilkadziesiąt razy szybciej."""
    found: list[int] = []
    for prefix in _prefixes(token):
        pos, hits = text.find(prefix), 0
        while pos >= 0 and hits < limit:
            if pos == 0 or not text[pos - 1].isalnum():
                found.append(pos)
                hits += 1
            pos = text.find(prefix, pos + 1)
    return sorted(found)[:limit]


def find_token(text: str, token: str) -> int:
    """Pozycja pierwszego trafienia albo -1."""
    first = _occurrences(text, token, 1)
    return first[0] if first else -1


def count_token(text: str, token: str) -> int:
    """Liczba wyrazów zaczynających się od słowa (z odmianą)."""
    words = _words(text)
    total = 0
    for prefix in _prefixes(token):
        lo = bisect_left(words.sorted, prefix)
        hi = bisect_left(words.sorted, prefix + "\uffff")
        total += words.cumulative[hi] - words.cumulative[lo]
    return total


def required_words(count: int) -> int:
    """Do dwóch słów muszą wystąpić wszystkie, dalej wolno pominąć jedno."""
    return count if count <= 2 else count - 1


def rank(docs: list[list[tuple[str, float]]], tokens: list[str]) -> list[tuple[int, float]]:
    """BM25 po polach z wagami (tekst znormalizowany przez `fold`); (indeks, wynik) malejąco.

    Dokument bez wymaganej liczby słów odpada; brakujące słowo obniża wynik kwadratem pokrycia.
    """
    if not tokens or not docs:
        return []
    need = required_words(len(tokens))
    tfs = [[sum(w * count_token(t, tok) for t, w in fields) for tok in tokens] for fields in docs]
    lengths = [sum(len(t) for t, _ in fields) or 1 for fields in docs]
    average = sum(lengths) / len(docs)
    total = len(docs)
    idf = []
    for i in range(len(tokens)):
        df = sum(1 for tf in tfs if tf[i] > 0)
        idf.append(math.log(1 + (total - df + 0.5) / (df + 0.5)))
    ranked = []
    for index, tf in enumerate(tfs):
        matched = sum(1 for f in tf if f > 0)
        if matched < need:
            continue
        norm = BM25_K1 * (1 - BM25_B + BM25_B * lengths[index] / average)
        score = sum(idf[i] * f * (BM25_K1 + 1) / (f + norm) for i, f in enumerate(tf) if f > 0)
        ranked.append((index, score * (matched / len(tokens)) ** 2))
    ranked.sort(key=lambda r: (-r[1], r[0]))
    return ranked


@dataclass(frozen=True)
class _Entry:
    document: Document
    meta: str  # tytuł i opis, znormalizowane
    body: str  # treść oryginalna ("" gdy brak pliku; wskaźnik bez tabeli)
    body_folded: str


@dataclass(frozen=True)
class SearchHit:
    document: Document
    fragment: str | None
    highlights: list[tuple[int, int]]  # [początek, koniec) w `fragment`
    strona: int | None
    score: float = 0.0


def build_index(entries: list[tuple[Document, Path | None]]) -> list[_Entry]:
    index = []
    for document, path in entries:
        body = ""
        if path and path.exists():
            body = path.read_text(encoding="utf-8")
            if document.typ == "wskaznik":
                body = body.split(TABLE_MARKER, 1)[0]
        meta = fold(f"{document.tytul} {document.opis or ''}")
        index.append(_Entry(document, meta, body, fold(body)))
    return index


def clean(text: str) -> str:
    """Tekst bez znaczników Markdown i kropek spisu treści, jedna spacja między słowami."""
    return re.sub(r"\s+", " ", MARKUP_RE.sub(" ", text)).strip()


def _highlights(fragment: str, tokens: list[str]) -> list[tuple[int, int]]:
    """Całe słowa, w których występuje szukane słowo lub jego rdzeń."""
    folded = fold(fragment)
    marks: list[list[int]] = []
    spans = []
    for token in tokens:
        for m in _pattern(token).finditer(folded):
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


def _in_toc(text: str, pos: int) -> bool:
    """Linia spisu treści: kropki prowadzące do numeru strony (w tej albo następnej linii)."""
    start = text.rfind("\n", 0, pos) + 1
    lines = text[start : start + 2 * SNIPPET_LENGTH].split("\n", 2)
    return bool(TOC_RE.search("\n".join(lines[:2])))


def highlight(fragment: str, query: str) -> list[tuple[int, int]]:
    return _highlights(fragment, query_tokens(query))


def _best_position(text: str, tokens: list[str]) -> int:
    """Miejsce na fragment: najlepiej poza spisem treści i ze wszystkimi słowami blisko siebie."""
    present = [t for t in tokens if find_token(text, t) >= 0]
    if not present:
        return -1
    candidates = sorted(p for t in present for p in _occurrences(text, t, MAX_CANDIDATES))
    outside_toc = [p for p in candidates if not _in_toc(text, p)]
    for pos in outside_toc:
        window = text[max(0, pos - PROXIMITY) : pos + PROXIMITY]
        if all(find_token(window, t) >= 0 for t in present):
            return pos
    return (outside_toc or candidates)[0]


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
    fragment = clean(raw)
    marks = _highlights(fragment, tokens)
    prefix = "…" if start > 0 else ""
    suffix = "…" if start + SNIPPET_LENGTH < len(entry.body) else ""
    pages = list(PAGE_RE.finditer(entry.body, 0, pos))
    page = int(pages[-1][1]) if pages else None
    shifted = [(s + len(prefix), e + len(prefix)) for s, e in marks]
    return prefix + fragment + suffix, shifted, page


def search(index: list[_Entry], query: str, limit: int) -> list[SearchHit]:
    tokens = query_tokens(query)
    fields = [[(entry.meta, META_WEIGHT), (entry.body_folded, 1.0)] for entry in index]
    hits = []
    for position, score in rank(fields, tokens)[:limit]:
        entry = index[position]
        snippet = _snippet(entry, tokens)
        fragment, marks, page = snippet if snippet else (None, [], None)
        hits.append(SearchHit(entry.document, fragment, marks, page, score))
    return hits
