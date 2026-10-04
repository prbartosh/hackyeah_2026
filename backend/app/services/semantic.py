"""Szukanie po znaczeniu w Zasobniku: wektory fragmentów dokumentów i kart innowacji.

Dokument dzielimy na fragmenty ok. CHUNK_CHARS znaków w obrębie strony (bez linii spisu treści),
każdy z tytułem dokumentu na początku. Wektory liczymy raz w tle przy starcie i zapisujemy
na dysk; nowy zestaw tekstów albo inny model to inny plik. Do gotowości indeksu szukanie działa
samymi słowami (BM25).
"""

from __future__ import annotations

import hashlib
import logging
import re
import threading
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from app.repositories.document_search import PAGE_RE, TOC_RE, clean
from app.schemas.document import Document
from app.services.embedder import Embedder

logger = logging.getLogger(__name__)

CHUNK_CHARS = 600
MIN_CHUNK_CHARS = 80
TITLE_CHARS = 120
CARD_CHARS = 1500
MAX_CACHED_TEXTS = 50_000
# Poniżej tego podobieństwa (kosinus) nie ma wyniku. Model słabo odróżnia zapytanie spoza tematu:
# na 10 trafnych zapytaniach najlepszy fragment ma 0,495-0,82, na 9 spoza tematu 0,33-0,56
# (przechodzą 2: „przepis na sernik”, „jak naprawić rower”), dlatego wynik ma etykietę
# „Podobny temat”. Karty są krótsze: trafne 0,47-0,49, spoza tematu do 0,35.
MIN_SIMILARITY = 0.48
MIN_CARD_SIMILARITY = 0.40
# Fragment, który nie jest zdaniami: tabela liczb (mało liter) albo tekst PDF z rozjechanym
# kodowaniem fontu („3DWU\FMą$QWRV]”, mało samogłosek). Takie fragmenty są podobne do wszystkiego.
MIN_LETTERS = 0.55
MIN_VOWELS = 0.28
VOWELS = frozenset("aeiouyąęó")
# Model nie zna skrótów: zapytanie z samych krótkich słów („AI”, „DPS”) szuka tylko po słowach.
MIN_WORD_LEN = 4


@dataclass(frozen=True)
class Chunk:
    document: Document
    page: int | None
    text: str


@dataclass(frozen=True)
class SemanticHit:
    document: Document
    page: int | None
    text: str
    score: float


def _pages(body: str) -> list[tuple[int | None, str]]:
    parts = PAGE_RE.split(body)
    pages: list[tuple[int | None, str]] = [(None, parts[0])]
    pages += [(int(parts[i]), parts[i + 1]) for i in range(1, len(parts) - 1, 2)]
    return pages


def is_prose(text: str) -> bool:
    letters = [ch for ch in text.lower() if ch.isalpha()]
    if len(letters) < MIN_LETTERS * len(text):
        return False
    return sum(ch in VOWELS for ch in letters) >= MIN_VOWELS * len(letters)


def has_meaning(query: str) -> bool:
    return any(len(word) >= MIN_WORD_LEN for word in re.findall(r"[^\W\d_]+", query))


def chunk_document(document: Document, body: str) -> list[Chunk]:
    """Fragmenty treści (w granicach strony); dokument bez treści to jeden fragment z opisu."""
    chunks = []
    for page, text in _pages(body):
        lines = [line for line in text.splitlines() if not TOC_RE.search(line)]
        words = clean("\n".join(lines)).split(" ")
        current: list[str] = []
        size = 0
        for word in words:
            current.append(word)
            size += len(word) + 1
            if size >= CHUNK_CHARS:
                chunks.append(Chunk(document, page, " ".join(current)))
                current, size = [], 0
        if size >= MIN_CHUNK_CHARS or (current and not chunks):
            chunks.append(Chunk(document, page, " ".join(current)))
    chunks = [c for c in chunks if c.text.strip() and is_prose(c.text)]
    if not chunks:
        chunks = [Chunk(document, None, clean(f"{document.tytul}. {document.opis or ''}"))]
    return chunks


def _embed_text(chunk: Chunk) -> str:
    return f"{chunk.document.tytul[:TITLE_CHARS]}. {chunk.text}"


class SemanticIndex:
    """Wektory fragmentów dokumentów (z pliku albo liczone w tle) i krótkich tekstów (karty,
    zgłoszenia: liczone przy pierwszym użyciu, w pamięci, kluczem jest skrót tekstu)."""

    def __init__(
        self, embedder: Embedder, cache_dir: Path, bundled_dir: Path | None = None
    ) -> None:
        self.embedder = embedder
        self._cache_dir = cache_dir
        # Plik policzony wcześniej i trzymany w repo (scripts/build_semantic_index.py).
        self._bundled_dir = bundled_dir
        self._chunks: list[Chunk] = []
        self._vectors: np.ndarray | None = None
        self._texts: dict[str, np.ndarray] = {}
        self._started = False
        self._lock = threading.Lock()

    @property
    def ready(self) -> bool:
        return self._vectors is not None

    def start(
        self,
        documents: Callable[[], list[tuple[Document, str]]],
        cards: Callable[[], dict[str, str]],
    ) -> None:
        """Liczy wektory kart i dokumentów w osobnym wątku (raz na proces)."""
        with self._lock:
            if self._started:
                return
            self._started = True
        threading.Thread(target=self._build_safe, args=(documents, cards), daemon=True).start()

    def _build_safe(
        self,
        documents: Callable[[], list[tuple[Document, str]]],
        cards: Callable[[], dict[str, str]],
    ) -> None:
        try:
            self.vectors(list(cards().values()))
            self.build(documents())
        except Exception:
            logger.exception("Indeks semantyczny niedostępny, szukanie działa samymi słowami")

    def build(self, documents: list[tuple[Document, str]]) -> Path:
        """Wektory fragmentów: z gotowego pliku (repo, potem cache) albo liczone i zapisane."""
        chunks = [c for document, body in documents for c in chunk_document(document, body)]
        texts = [_embed_text(c) for c in chunks]
        digest = hashlib.sha1("\n".join([self.embedder.model, *texts]).encode()).hexdigest()
        name = f"dokumenty-{digest[:16]}.npy"
        dirs = (self._bundled_dir, self._cache_dir)
        found = [d / name for d in dirs if d and (d / name).exists()]
        if found:
            path = found[0]
            vectors = np.load(path)
        else:
            logger.info("Indeks semantyczny: %d fragmentów, liczenie wektorów", len(texts))
            vectors = self.embedder.embed(texts)
            path = self._cache_dir / name
            path.parent.mkdir(parents=True, exist_ok=True)
            np.save(path, vectors)
            for stale in path.parent.glob("dokumenty-*.npy"):
                if stale != path:
                    stale.unlink()  # indeks dla starych tekstów albo innego modelu
        self._chunks = chunks
        self._vectors = vectors
        logger.info("Indeks semantyczny gotowy: %d fragmentów (%s)", len(chunks), path.name)
        return path

    def _query(self, query: str) -> np.ndarray:
        return self.embedder.embed([query])[0]

    def search_documents(self, query: str, limit: int) -> list[SemanticHit]:
        """Najlepszy fragment na dokument, od najbardziej podobnego; pusto bez gotowego indeksu."""
        if self._vectors is None or not len(self._chunks) or not has_meaning(query):
            return []
        scores = self._vectors @ self._query(query)
        hits: dict[str, SemanticHit] = {}
        for i in np.argsort(-scores):
            score = float(scores[i])
            if score < MIN_SIMILARITY or len(hits) >= limit:
                break
            chunk = self._chunks[i]
            if chunk.document.id not in hits:
                hits[chunk.document.id] = SemanticHit(chunk.document, chunk.page, chunk.text, score)
        return list(hits.values())

    def vectors(self, texts: list[str]) -> np.ndarray:
        """Wektory krótkich tekstów (karty, zgłoszenia); liczone raz na tekst."""
        if len(self._texts) > MAX_CACHED_TEXTS:
            self._texts.clear()
        missing = [t for t in dict.fromkeys(texts) if _text_key(t) not in self._texts]
        if missing:
            computed = self.embedder.embed([t[:CARD_CHARS] for t in missing])
            for text, vector in zip(missing, computed, strict=True):
                self._texts[_text_key(text)] = vector
        if not texts:
            return np.zeros((0, 0), dtype=np.float32)
        return np.stack([self._texts[_text_key(t)] for t in texts])

    def text_similarities(self, query: str, texts: list[str]) -> list[float]:
        """Kosinus zapytania z każdym tekstem, w tej samej kolejności."""
        if not texts:
            return []
        return [float(s) for s in self.vectors(texts) @ self.vectors([query])[0]]

    def similarities(self, query: str, cards: dict[str, str]) -> dict[str, float]:
        """Kosinus zapytania z każdą kartą (`cards`: slug -> tekst karty)."""
        return dict(zip(cards, self.text_similarities(query, list(cards.values())), strict=True))

    def search_cards(self, query: str, cards: dict[str, str], limit: int) -> list[str]:
        """Slugi kart od najbardziej podobnej; `cards` to slug -> tekst karty."""
        if not cards or not has_meaning(query):
            return []
        slugs = list(cards)
        scores = self.vectors(list(cards.values())) @ self._query(query)
        order = [i for i in np.argsort(-scores) if scores[i] >= MIN_CARD_SIMILARITY]
        return [slugs[i] for i in order[:limit]]


def _text_key(text: str) -> str:
    return hashlib.sha1(text.encode()).hexdigest()


def card_text(nazwa: str, *parts: str | None) -> str:
    return re.sub(r"\s+", " ", ". ".join([nazwa, *(p for p in parts if p)])).strip()
