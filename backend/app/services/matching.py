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
# Ile innych nazw jednego pojęcia ze słownika trafia do zapytań zastępczych.
SYNONYMS_PER_CONCEPT = 2
SYNONYM_SECTIONS = ("problemy", "grupy_docelowe")
# Podobieństwo znaczenia z modelu embeddingów (ADR 0016) dokłada się do wyniku karty względem
# typowego poziomu: karta bliższa niż MEANING_CENTER zyskuje, dalsza traci. Na zestawie testowym
# (docs/zestaw-testowy.md) top 1 z 28 do 31/35, top 3 z 32 do 34/35, a zgłoszenie spoza bazy (#28)
# z 0,27 do 0,22 przy progu 0,30. Wynik stabilny dla wag 0,1-0,3 i środka 0,3-0,5.
MEANING_WEIGHT = 0.2
# Bez modelu embeddingów (SEMANTIC_SEARCH=false, testy) duplikaty i grupy radaru liczymy trigramami
# z ich własnymi progami: progi panelu dotyczą embeddingów i nie pasują do trigramów.
TRIGRAM_DUPLICATES = 0.55
TRIGRAM_CLUSTER = 0.30
MEANING_CENTER = 0.4
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


def synonym_queries(query: str, vocabulary: Vocabulary, limit: int = 8) -> list[str]:
    """Zapytania zastępcze: fraza ze słownika (etykieta lub alias) podmieniona na inne jej nazwy.

    „osoby starsze” -> „seniorzy”, „emeryci”, ... Reszta zapytania zostaje bez zmian.
    Tylko problemy i grupy: aliasy miejsc i typów rozwiązań to różne rzeczy jednej kategorii
    (DPS, WTZ, klub seniora), nie synonimy.
    """
    words = _TOKEN.findall(query.lower())
    tokens = [stem(w) for w in words]
    alternatives: list[str] = []
    for section in SYNONYM_SECTIONS:
        for value in vocabulary.get(section, []):
            phrases = [value["etykieta"], *value.get("aliasy", [])]
            # Najpierw dłuższe frazy: „przemoc domowa” zamiast „przemoc” + reszta „domowa”.
            for phrase in sorted(phrases, key=lambda p: -len(_stems(p))):
                stems = _stems(phrase)
                if sum(len(s) for s in stems) < 3:
                    continue
                start = next(
                    (i for i in range(len(tokens)) if tokens[i : i + len(stems)] == stems), None
                )
                if start is None:
                    continue
                rest = words[:start] + words[start + len(stems) :]
                others = [o for o in phrases if o != phrase][:SYNONYMS_PER_CONCEPT]
                alternatives += [" ".join([*rest, o.lower()]) for o in others]
                break
    unique = dict.fromkeys(a for a in alternatives if a != query.lower())
    return list(unique)[:limit]


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


def add_meaning(match: CardMatch, similarity: float) -> CardMatch:
    match.score = max(0.0, match.score + MEANING_WEIGHT * (similarity - MEANING_CENTER))
    return match


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
