import json
from functools import lru_cache
from pathlib import Path

from app.schemas.innovation import Innovation


@lru_cache
def _load(path: Path) -> dict[str, Innovation]:
    records = json.loads(path.read_text(encoding="utf-8"))
    return {r["slug"]: Innovation.model_validate(r) for r in records}


class InnovationRepository:
    """Baza innowacji ROPS z pliku JSON (tylko odczyt, wczytywana raz na proces)."""

    def __init__(self, path: Path) -> None:
        self._by_slug = _load(path)

    def get(self, slug: str) -> Innovation | None:
        return self._by_slug.get(slug)

    def get_many(self, slugs: list[str]) -> list[Innovation]:
        return [self._by_slug[s] for s in slugs if s in self._by_slug]

    def all(self) -> list[Innovation]:
        # Stała kolejność - katalog trafia do promptu i musi być identyczny dla cache.
        return [self._by_slug[s] for s in sorted(self._by_slug)]
