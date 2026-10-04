"""Port do modelu embeddingów i adapter lokalnego modelu fastembed.

Serwisy i repozytoria znają tylko `Embedder`; fastembed importuje wyłącznie `FastEmbedder`.
Model działa lokalnie (ONNX, CPU), bez klucza API: DeepSeek nie ma embeddingów.
"""

from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Protocol

import numpy as np

logger = logging.getLogger(__name__)


class Embedder(Protocol):
    model: str

    def embed(self, texts: list[str]) -> np.ndarray:
        """Wektory znormalizowane (długość 1), jeden wiersz na tekst."""
        ...


class FastEmbedder:
    def __init__(self, model: str, cache_dir: Path) -> None:
        self.model = model
        self._cache_dir = cache_dir
        self._engine = None
        self._lock = threading.Lock()

    def _load(self):
        with self._lock:
            if self._engine is None:
                from fastembed import TextEmbedding

                logger.info("Ładowanie modelu embeddingów %s", self.model)
                self._engine = TextEmbedding(self.model, cache_dir=str(self._cache_dir))
        return self._engine

    def embed(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, 0), dtype=np.float32)
        vectors = np.array(list(self._load().embed(texts, batch_size=64)), dtype=np.float32)
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        return vectors / np.where(norms == 0, 1, norms)
