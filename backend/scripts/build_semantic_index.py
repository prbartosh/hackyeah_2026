"""Liczy wektory fragmentów dokumentów Zasobnika do pliku w repo.

Plik `assets/semantic/dokumenty-<skrót>.npy` aplikacja czyta przy starcie zamiast liczyć
od nowa (ok. 10 minut CPU). Uruchom po każdej zmianie dokumentów w `assets/` i dodaj nowy plik
do commita; stary jest usuwany. Z katalogu backend/:
    python scripts/build_semantic_index.py
"""

import logging
import time

from app.api.deps import get_document_repository
from app.core.config import settings
from app.services.embedder import FastEmbedder
from app.services.semantic import SemanticIndex


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    target = settings.assets_path / "semantic"
    embedder = FastEmbedder(settings.embedding_model, settings.cache_path / "fastembed")
    start = time.time()
    path = SemanticIndex(embedder, target).build(get_document_repository().texts())
    print(f"{path} ({path.stat().st_size // 1_000_000} MB, {time.time() - start:.0f} s)")


if __name__ == "__main__":
    main()
