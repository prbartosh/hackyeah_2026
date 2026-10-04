from __future__ import annotations

import json
import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.repositories.document_search import SearchHit, build_index, search
from app.repositories.innovation_search import matches_query, normalize, tokens
from app.schemas.document import Document, DocumentDetail, DocumentType

logger = logging.getLogger(__name__)

OBSERVATORY_URL = "https://obserwator.rops.krakow.pl/"
# Kolejność listy: Mapa Wyzwań, publikacje i raporty od najnowszych, na końcu wskaźniki.
TYPE_ORDER: dict[str, int] = {"mapa-wyzwan": 0, "publikacja": 1, "raport": 2, "wskaznik": 3}
SIZE_RE = re.compile(r"Rozmiar:\s*(.+)")


def _read_json(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        logger.warning("Brak pliku dokumentów: %s", path)
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _asset(assets: Path, repo_path: str | None) -> Path | None:
    """Ścieżki w metadata.json są względem katalogu repo (`assets/...`)."""
    if not repo_path:
        return None
    return assets / repo_path.removeprefix("assets/")


def _pdf_document(
    assets: Path, typ: DocumentType, record: dict[str, Any], doc_id: str
) -> tuple[Document, Path | None]:
    size = SIZE_RE.search(record.get("info") or "")
    document = Document(
        id=doc_id,
        typ=typ,
        tytul=record["title"].strip(),
        opis=(record.get("description") or "").strip() or None,
        rok=record.get("year"),
        url_zrodlowy=record["url"],
        licencja=record.get("licencja"),
        strony=record.get("pages"),
        rozmiar=size[1].strip() if size else None,
        kategoria=None,
        zrodlo_danych=None,
    )
    return document, _asset(assets, record.get("text"))


def _indicator(assets: Path, record: dict[str, Any]) -> tuple[Document, Path | None]:
    description = record.get("description") or {}
    texts = sorted((assets / "obserwator" / "text").glob(f"{record['id']}-*.md"))
    document = Document(
        id=f"wskaznik-{record['id']}",
        typ="wskaznik",
        tytul=record["name"].strip(),
        opis=(description.get("Opis") or "").strip() or None,
        rok=None,
        url_zrodlowy=OBSERVATORY_URL,
        licencja=None,
        strony=None,
        rozmiar=None,
        kategoria=record.get("category"),
        zrodlo_danych=(description.get("Źródło") or "").strip() or None,
    )
    return document, texts[0] if texts else None


@lru_cache
def _load(assets: Path) -> dict[str, tuple[Document, Path | None]]:
    """id -> (dokument, plik z treścią). Treść czytana dopiero przy `get`."""
    entries: list[tuple[Document, Path | None]] = []
    for record in _read_json(assets / "raporty" / "metadata.json"):
        entries.append(_pdf_document(assets, "raport", record, f"raport-{record['id']}"))
    for typ, folder in (("publikacja", "publikacje"), ("mapa-wyzwan", "mapa-wyzwan")):
        for record in _read_json(assets / folder / "metadata.json"):
            # Bez id w źródle - stabilny identyfikator z nazwy pliku tekstu.
            doc_id = f"{typ}-{Path(record['text']).stem}"
            entries.append(_pdf_document(assets, typ, record, doc_id))
    for record in _read_json(assets / "obserwator" / "indicators.json"):
        entries.append(_indicator(assets, record))
    entries.sort(
        key=lambda e: (TYPE_ORDER[e[0].typ], -(e[0].rok or 0), e[0].kategoria or "", e[0].tytul)
    )
    return {document.id: (document, text) for document, text in entries}


@lru_cache
def _index(assets: Path):
    return build_index(list(_load(assets).values()))


class DocumentRepository:
    def __init__(self, assets: Path) -> None:
        self._assets = assets
        self._by_id = _load(assets)

    def search(self, q: str, limit: int) -> list[SearchHit]:
        """Treść dokumentów, nie tylko tytuł i opis; indeks powstaje przy pierwszym wywołaniu."""
        return search(_index(self._assets), q, limit)

    def list(
        self, typ: DocumentType | None = None, rok: int | None = None, q: str | None = None
    ) -> list[Document]:
        words = tokens(q) if q else []
        return [
            document
            for document, _ in self._by_id.values()
            if (not typ or document.typ == typ)
            and (rok is None or document.rok == rok)
            and matches_query(normalize(f"{document.tytul} {document.opis or ''}"), words)
        ]

    def get(self, doc_id: str) -> DocumentDetail | None:
        entry = self._by_id.get(doc_id)
        if entry is None:
            return None
        document, text = entry
        tresc = text.read_text(encoding="utf-8") if text and text.exists() else None
        return DocumentDetail(**document.model_dump(), tresc=tresc)
