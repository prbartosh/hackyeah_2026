"""Lokalny zamiennik embeddingów (bez klucza API) i podobieństwo kosinusowe.

Haszowane trigramy znaków wystarczają do wykrywania duplikatów i grupowania zgłoszeń
w demo offline. Z modelem OpenAI nie jest porównywalny,
dlatego każdy wektor ma zapisaną nazwę modelu.
"""

import hashlib
import math
import re
from collections import Counter

LOCAL_MODEL = "local-trigram-v1"
DIMENSIONS = 1024
NGRAM = 3
STEM_LEN = 5  # tylko do nazw grup w radarze

STOPWORDS = frozenset(
    "oraz jest nie sie dla ktore ktora ktory przez jako albo tylko moze bardzo jestem sa ale "
    "ich tez tego tym tej ten ta to co jak czy po od do na w z i a o u".split()
)
_WORD = re.compile(r"[^\W\d_]{3,}", re.UNICODE)


def tokenize(text: str) -> list[str]:
    words = (w.lower() for w in _WORD.findall(text))
    return [w[:STEM_LEN] for w in words if w not in STOPWORDS]


def local_embed(text: str) -> list[float]:
    """Trigramy znaków w obrębie słów: odporne na polską fleksję (demencji, demencję)."""
    vec = [0.0] * DIMENSIONS
    for word in _WORD.findall(text.lower()):
        if word in STOPWORDS:
            continue
        padded = f"^{word}$"
        for i in range(max(1, len(padded) - NGRAM + 1)):
            digest = hashlib.md5(padded[i : i + NGRAM].encode("utf-8")).digest()
            vec[int.from_bytes(digest[:4], "big") % DIMENSIONS] += 1.0
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec] if norm else vec


def cosine(a: list[float], b: list[float]) -> float:
    """Podobieństwo kosinusowe; wektory mogą nie być znormalizowane."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


class TfidfIndex:
    """Przestrzeń wektorowa TF-IDF po rdzeniach słów (lokalnie, bez API).

    IDF liczony na korpusie dokumentów: rzadkie słowa ("demencja") ważą więcej niż pospolite
    ("osoba"), a długi opis nie wygrywa samą długością (kosinus, tf logarytmiczne).
    """

    def __init__(self, documents: list[str]) -> None:
        counts = [Counter(tokenize(d)) for d in documents]
        df = Counter(t for c in counts for t in c)
        n = len(documents)
        self._idf = {t: math.log((n + 1) / (f + 1)) + 1 for t, f in df.items()}
        self._docs = [self._vector(c) for c in counts]

    def _vector(self, counts: Counter[str]) -> dict[str, float]:
        vec = {t: (1 + math.log(c)) * self._idf[t] for t, c in counts.items() if t in self._idf}
        norm = math.sqrt(sum(v * v for v in vec.values()))
        return {t: v / norm for t, v in vec.items()} if norm else {}

    def scores(self, query: str) -> list[float]:
        """Kosinus zapytania z każdym dokumentem, w kolejności dokumentów."""
        q = self._vector(Counter(tokenize(query)))
        return [sum(w * d.get(t, 0.0) for t, w in q.items()) for d in self._docs]
