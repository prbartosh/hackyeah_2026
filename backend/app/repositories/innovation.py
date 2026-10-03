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
# Typowane listy nakładki (ADR 0004 §3) - tylko te pola trafiają do katalogu.
OVERLAY_LISTS = ("grupy_docelowe", "problemy", "miejsca", "skale", "typy_rozwiazan", "role")


@lru_cache
def _load(path: Path) -> dict[str, Innovation]:
    records = json.loads(path.read_text(encoding="utf-8"))
    return {r["slug"]: Innovation.model_validate(r) for r in records}


@lru_cache
def _load_overlay(path: Path, known: frozenset[str]) -> dict[str, dict[str, Any]]:
    """Zatwierdzona nakładka (wzbogacenia.json), jeśli plik istnieje."""
    if not path.exists():
        return {}
    overlay: dict[str, dict[str, Any]] = {}
    for record in json.loads(path.read_text(encoding="utf-8")):
        slug = record.get("slug")
        if not record.get("zatwierdzone") or slug not in known:
            continue
        overlay[slug] = {k: record[k] for k in OVERLAY_LISTS if record.get(k)}
        if record.get("wdrozenie"):
            overlay[slug]["wdrozenie"] = record["wdrozenie"]
    logger.info("Nakładka innowacji: %s zatwierdzonych rekordów", len(overlay))
    return overlay


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
        self._overlay = _load_overlay(path.parent / OVERLAY_FILE, frozenset(self._by_slug))
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
