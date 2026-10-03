import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.schemas.innovation import Innovation

logger = logging.getLogger(__name__)

OVERLAY_FILE = "wzbogacenia.json"
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


# Migawka kart z bazy (panel administratora, ADR 0006): slug -> (opublikowana, karta, nakładka).
# Karty z bazy przesłaniają te z plików; nieopublikowane znikają z katalogu.
_db_snapshot: dict[str, tuple[bool, Innovation, dict[str, Any] | None]] = {}


def set_db_snapshot(cards: dict[str, tuple[bool, Innovation, dict[str, Any] | None]]) -> None:
    global _db_snapshot
    _db_snapshot = cards


class InnovationRepository:
    """Baza innowacji ROPS: pliki JSON plus migawka kart z bazy (tylko odczyt)."""

    def __init__(self, path: Path) -> None:
        self._by_slug = dict(_load(path))
        self._overlay = dict(_load_overlay(path.parent / OVERLAY_FILE, frozenset(self._by_slug)))
        for slug, (published, card, overlay) in _db_snapshot.items():
            self._overlay.pop(slug, None)
            if not published:
                self._by_slug.pop(slug, None)
                continue
            self._by_slug[slug] = card
            if overlay:
                self._overlay[slug] = overlay

    def get(self, slug: str) -> Innovation | None:
        return self._by_slug.get(slug)

    def get_many(self, slugs: list[str]) -> list[Innovation]:
        return [self._by_slug[s] for s in slugs if s in self._by_slug]

    def all(self) -> list[Innovation]:
        # Stała kolejność - katalog trafia do promptu i musi być identyczny dla cache.
        return [self._by_slug[s] for s in sorted(self._by_slug)]

    def overlay(self, slug: str) -> dict[str, Any] | None:
        return self._overlay.get(slug)
