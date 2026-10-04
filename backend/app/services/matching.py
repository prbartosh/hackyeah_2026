"""Deterministyczne dopasowanie zgłoszeń do kart bez embeddingów (ADR 0006).

Czyste funkcje, bez bazy i bez AI: ten sam tekst daje ten sam wynik, a przy każdym dopasowaniu
znamy powód (etykiety wspólnych tagów ze słownika).
"""

import json
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.services.embeddings import cosine, local_embed

_vector = lru_cache(maxsize=2048)(local_embed)

Vocabulary = dict[str, list[dict[str, Any]]]
Tags = dict[str, list[str]]

# Sekcje słownika używane do dopasowania i ich wagi.
WEIGHTS = {"problemy": 3, "grupy_docelowe": 2, "miejsca": 1, "typy_rozwiazan": 1}
# Wynik tekstowy (TF-IDF) ma w wyniku końcowym wagę VECTOR_WEIGHT; kosinus krótkiego zgłoszenia
# z długim opisem karty rzadko przekracza ~0,25, więc VECTOR_SCALE rozciąga go do 0-1.
VECTOR_WEIGHT = 0.6
VECTOR_SCALE = 0.25
# Karta bez żadnego wspólnego tagu (albo zgłoszenie bez tagów) pasuje tylko tekstem, a to słabszy
# dowód: jej wynik mnożymy przez ten czynnik, więc potrzeba mocniejszego podobieństwa słów.
TEXT_ONLY_FACTOR = 0.6
# Same miejsce lub typ rozwiązania („Dom”, „Urządzenie”) to zbyt ogólny powód: tag liczy się jako
# dowód dopiero, gdy wspólny jest problem albo grupa docelowa (waga >= tej wartości).
STRONG_TAG_WEIGHT = 2
# Słowa od tylu liter skracamy do tylu liter (fleksja: demencji/demencja, seniorów/senior).
STEM_LEN = 6
_TOKEN = re.compile(r"[^\W_]+\+?", re.UNICODE)


@lru_cache
def load_vocabulary(path: Path) -> Vocabulary:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def stem(word: str) -> str:
    return word[:STEM_LEN]


def _stems(text: str) -> list[str]:
    return [stem(w) for w in _TOKEN.findall(text.lower())]


def _contains(haystack: list[str], needle: list[str]) -> bool:
    n = len(needle)
    return n > 0 and any(haystack[i : i + n] == needle for i in range(len(haystack) - n + 1))


def tag_text(text: str, vocabulary: Vocabulary) -> Tags:
    """Slugi ze słownika, których etykieta lub alias występuje w tekście jako cała fraza."""
    tokens = _stems(text)
    found: Tags = {}
    for section in WEIGHTS:
        slugs = []
        for value in vocabulary.get(section, []):
            phrases = [value["etykieta"], *value.get("aliasy", [])]
            for phrase in phrases:
                stems = _stems(phrase)
                # Pojedyncze bardzo krótkie słowa dają za dużo fałszywych trafień.
                if sum(len(s) for s in stems) < 3:
                    continue
                if _contains(tokens, stems):
                    slugs.append(value["slug"])
                    break
        if slugs:
            found[section] = slugs
    return found


def labels(vocabulary: Vocabulary) -> dict[str, dict[str, str]]:
    return {s: {v["slug"]: v["etykieta"] for v in values} for s, values in vocabulary.items()}


def similar_text(a: str, b: str) -> float:
    """Podobieństwo trigramów znaków (0-1), liczone w locie."""
    return cosine(_vector(a), _vector(b))


@dataclass
class CardMatch:
    score: float
    powody: list[str] = field(default_factory=list)
    trigram: float = 0.0
    vector: float = 0.0


def card_score(
    ticket_tags: Tags,
    overlay: dict[str, Any] | None,
    label_map: dict[str, dict[str, str]],
    ticket_text: str,
    card_text: str,
    vector: float | None = None,
) -> CardMatch:
    """Ważone pokrycie tagów zgłoszenia przez nakładkę karty, z podobieństwem tekstu.

    Bez `vector`: samo pokrycie tagów, remis rozstrzyga trigram. Z `vector` (TF-IDF na korpusie
    kart, patrz `TfidfIndex`): 40% pokrycia tagów i 60% tekstu, żeby karta pasująca tylko
    ogólnym tagiem („Dzieci”) nie wygrywała z kartą o tych samych słowach. Karta bez nakładki
    albo zgłoszenie bez tagów, a także karta bez żadnego wspólnego tagu: sam tekst razy
    `TEXT_ONLY_FACTOR` (bez `vector`: trigramy).
    """
    trigram = similar_text(ticket_text, card_text)
    vector_given = vector is not None
    if vector is None:
        textual, vector = trigram, 0.0
    else:
        textual = min(1.0, vector / VECTOR_SCALE)
    overlay = overlay or {}
    total = sum(WEIGHTS[s] * len(slugs) for s, slugs in ticket_tags.items())
    if vector_given:
        textual *= TEXT_ONLY_FACTOR
    if not total or not any(overlay.get(s) for s in WEIGHTS):
        return CardMatch(score=textual, trigram=trigram, vector=vector)
    covered, covered_strong, reasons = 0, 0, []
    for section, slugs in ticket_tags.items():
        have = set(overlay.get(section) or [])
        for slug in slugs:
            if slug in have:
                covered += WEIGHTS[section]
                covered_strong += WEIGHTS[section] >= STRONG_TAG_WEIGHT
                reasons.append(label_map.get(section, {}).get(slug, slug))
    coverage = covered / total
    if vector_given:
        if not covered or covered_strong == 0:
            return CardMatch(score=textual, powody=reasons, trigram=trigram, vector=vector)
        coverage = (1 - VECTOR_WEIGHT) * coverage + VECTOR_WEIGHT * textual / TEXT_ONLY_FACTOR
    return CardMatch(score=coverage, powody=reasons, trigram=trigram, vector=vector)


def rank_key(match: CardMatch) -> tuple[float, float, float]:
    return (match.score, match.vector, match.trigram)


def tag_labels(tags: Tags, label_map: dict[str, dict[str, str]], section: str) -> list[str]:
    return [label_map.get(section, {}).get(s, s) for s in tags.get(section, [])]


def valid_tags(raw: Any, vocabulary: Vocabulary, limit: int = 3) -> Tags:
    """Tagi od modelu: tylko slugi ze słownika, w znanych sekcjach."""
    if not isinstance(raw, dict):
        return {}
    clean: Tags = {}
    for section in WEIGHTS:
        allowed = {v["slug"] for v in vocabulary.get(section, [])}
        values = raw.get(section)
        if not isinstance(values, list):
            continue
        slugs = [s for s in dict.fromkeys(values) if isinstance(s, str) and s in allowed]
        if slugs:
            clean[section] = slugs[:limit]
    return clean
