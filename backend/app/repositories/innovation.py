from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.repositories.innovation_search import haystack, matches_query, sort_key, tokens
from app.schemas.innovation import Category, Innovation

logger = logging.getLogger(__name__)

OVERLAY_FILE = "wzbogacenia.json"
CATEGORIES_FILE = "kategorie.json"
VOCABULARY_FILE = "slownik.json"
# Typowane listy nakładki i ich limity (ADR 0004 §3) - tylko te pola trafiają do katalogu.
OVERLAY_LIMITS = {
    "grupy_docelowe": (1, 3),
    "problemy": (1, 3),
    "miejsca": (0, 3),
    "skale": (1, 2),
    "typy_rozwiazan": (1, 2),
    "role": (1, 3),
}
OVERLAY_LISTS = tuple(OVERLAY_LIMITS)

# slug wartości -> etykieta, osobno dla każdej sekcji słownika
Vocabulary = dict[str, dict[str, str]]

# Poprawki ręczne po slugu. innowacje.json nadpisuje scraper, więc nie edytujemy go ręcznie.
# W polu `organizacja` scraper zostawił nazwiska autorów, a strona innowacji i wyniki czatu są
# publiczne (docs/baza-innowacji.md: nazwisk osób nie zapisujemy).
CORRECTIONS: dict[str, dict[str, Any]] = {
    "sciezka-motosensoryczna": {"organizacja": "Politechnika Krakowska"},
}


@lru_cache
def _load(path: Path) -> dict[str, Innovation]:
    records = json.loads(path.read_text(encoding="utf-8"))
    innovations = {r["slug"]: Innovation.model_validate(r) for r in records}
    for slug, fix in CORRECTIONS.items():
        if slug in innovations:
            innovations[slug] = innovations[slug].model_copy(update=fix)
    return innovations


@lru_cache
def _load_vocabulary(path: Path) -> dict[str, list[dict[str, Any]]]:
    """Słownik wartości (slownik.json, ADR 0004 §5), pusty, jeśli pliku nie ma."""
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def overlay_problems(record: dict[str, Any], vocabulary: Vocabulary) -> list[str]:
    """Błędy rekordu nakładki względem słownika i limitów (ADR 0004 §6 pkt 7)."""
    problems: list[str] = []
    for name, (low, high) in OVERLAY_LIMITS.items():
        values = record.get(name) or []
        allowed = vocabulary.get(name, {})
        unknown = [v for v in values if v not in allowed]
        if unknown:
            problems.append(f"{name}: spoza słownika {unknown}")
        if len(set(values)) != len(values):
            problems.append(f"{name}: duplikaty")
        if not low <= len(set(values)) <= high:
            problems.append(f"{name}: {len(set(values))} wartości, limit {low}-{high}")
    wdrozenie = record.get("wdrozenie") or {}
    unknown = [
        v
        for v in wdrozenie.get("wymagane_zasoby") or []
        if v not in vocabulary.get("wymagane_zasoby", {})
    ]
    if unknown:
        problems.append(f"wdrozenie.wymagane_zasoby: spoza słownika {unknown}")
    return problems


def _clean_list(values: list[str], allowed: dict[str, str], limit: int) -> list[str]:
    return [v for v in dict.fromkeys(values) if v in allowed][:limit]


@lru_cache
def _load_overlay(
    path: Path, known: frozenset[str], vocabulary_path: Path
) -> dict[str, dict[str, Any]]:
    """Zatwierdzona nakładka (wzbogacenia.json), jeśli plik istnieje.

    Błędne wartości są logowane i pomijane - zły wpis nie blokuje startu backendu.
    """
    if not path.exists():
        return {}
    vocabulary = vocabulary_labels(_load_vocabulary(vocabulary_path))
    overlay: dict[str, dict[str, Any]] = {}
    for record in json.loads(path.read_text(encoding="utf-8")):
        slug = record.get("slug")
        if not record.get("zatwierdzone") or slug not in known:
            continue
        for problem in overlay_problems(record, vocabulary):
            logger.warning("Nakładka %s: %s", slug, problem)
        lists = {
            k: _clean_list(record.get(k) or [], vocabulary.get(k, {}), OVERLAY_LIMITS[k][1])
            for k in OVERLAY_LISTS
        }
        overlay[slug] = {k: v for k, v in lists.items() if v}
        if record.get("wdrozenie"):
            overlay[slug]["wdrozenie"] = record["wdrozenie"]
    logger.info("Nakładka innowacji: %s zatwierdzonych rekordów", len(overlay))
    return overlay


def vocabulary_labels(raw: dict[str, list[dict[str, Any]]]) -> Vocabulary:
    return {section: {v["slug"]: v["etykieta"] for v in values} for section, values in raw.items()}


@lru_cache
def _load_category_names(path: Path) -> dict[str, str]:
    """Nazwy kategorii z kategorie.json (slug -> nazwa); bez pliku zostają same slugi."""
    if not path.exists():
        return {}
    return {c["slug"]: c["nazwa"] for c in json.loads(path.read_text(encoding="utf-8"))}


@lru_cache
def _load_haystacks(path: Path) -> dict[str, str]:
    """Znormalizowany tekst do wyszukiwania (slug -> tekst), liczony raz na plik."""
    return {slug: haystack(r) for slug, r in _load(path).items()}


class InnovationRepository:
    """Baza innowacji ROPS z plików JSON (tylko odczyt, wczytywana raz na proces)."""

    def __init__(self, path: Path) -> None:
        self._by_slug = _load(path)
        vocabulary_path = path.parent / VOCABULARY_FILE
        self._vocabulary = _load_vocabulary(vocabulary_path)
        self._overlay = _load_overlay(
            path.parent / OVERLAY_FILE, frozenset(self._by_slug), vocabulary_path
        )
        self._category_names = _load_category_names(path.parent / CATEGORIES_FILE)
        self._haystacks = _load_haystacks(path)

    def get(self, slug: str) -> Innovation | None:
        return self._by_slug.get(slug)

    def get_many(self, slugs: list[str]) -> list[Innovation]:
        return [self._by_slug[s] for s in slugs if s in self._by_slug]

    def all(self) -> list[Innovation]:
        # Stała kolejność - katalog trafia do promptu i musi być identyczny dla cache.
        return [self._by_slug[s] for s in sorted(self._by_slug)]

    def list(
        self, kategoria: str | None = None, q: str | None = None, wybrane: bool = False
    ) -> list[Innovation]:
        """Innowacje po filtrach (kategoria, słowa z q, tylko wybrane), posortowane po nazwie."""
        words = tokens(q) if q else []
        found = [
            r
            for slug, r in self._by_slug.items()
            if (not kategoria or kategoria in r.kategorie)
            and (not wybrane or r.wybrana_do_upowszechniania)
            and matches_query(self._haystacks[slug], words)
        ]
        return sorted(found, key=sort_key)

    def categories(self) -> list[Category]:
        """Kategorie z liczbą innowacji (liczone z rekordów, zgodnie z filtrem `kategoria`)."""
        counts: dict[str, int] = {}
        for r in self._by_slug.values():
            for slug in r.kategorie:
                counts[slug] = counts.get(slug, 0) + 1
        names = self._category_names
        slugs = sorted(set(names) | set(counts), key=lambda s: names.get(s, s))
        return [
            Category(slug=s, nazwa=names.get(s, s), liczba_innowacji=counts.get(s, 0))
            for s in slugs
        ]

    def overlay(self, slug: str) -> dict[str, Any] | None:
        return self._overlay.get(slug)

    def vocabulary(self) -> dict[str, list[dict[str, Any]]]:
        """Pełny słownik: sekcja -> [{slug, etykieta, aliasy}]."""
        return self._vocabulary

    def vocabulary_slugs(self, section: str) -> set[str]:
        return {v["slug"] for v in self._vocabulary.get(section, [])}
