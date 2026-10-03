"""Lokalny zamiennik embeddingów (bez klucza API) i podobieństwo kosinusowe.

Haszowany worek słów z grubym stemmingiem (pierwsze 5 liter) wystarcza do wykrywania
duplikatów i grupowania zgłoszeń w demo offline. Z modelem OpenAI nie jest porównywalny,
dlatego każdy wektor ma zapisaną nazwę modelu.
"""

import hashlib
import math
import re

LOCAL_MODEL = "local-hash-v1"
DIMENSIONS = 512
STEM_LEN = 5

STOPWORDS = frozenset(
    "oraz jest nie sie dla ktore ktora ktory przez jako albo tylko moze bardzo jestem sa ale "
    "ich tez tego tym tej ten ta to co jak czy po od do na w z i a o u".split()
)
_WORD = re.compile(r"[^\W\d_]{3,}", re.UNICODE)


def tokenize(text: str) -> list[str]:
    words = (w.lower() for w in _WORD.findall(text))
    return [w[:STEM_LEN] for w in words if w not in STOPWORDS]


def local_embed(text: str) -> list[float]:
    vec = [0.0] * DIMENSIONS
    for token in tokenize(text):
        digest = hashlib.md5(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % DIMENSIONS
        vec[index] += 1.0 if digest[4] % 2 == 0 else -1.0
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
