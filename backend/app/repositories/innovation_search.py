"""Wyszukiwanie tekstowe w bazie innowacji (zasobnik wiedzy, zadanie 0003).

Zapytanie to słowa rozdzielone spacją; innowacja pasuje, gdy każde słowo występuje w jej tekście.
Wielkość liter i polskie znaki nie mają znaczenia, odmiany łapie lekka heurystyka (nie stemmer).
"""

import re
import unicodedata

from app.schemas.innovation import Innovation

# Pola przeszukiwane: nazwa, problem, odbiorcy, wdrażający, opis, organizacja
SEARCH_FIELDS = ("nazwa", "problem", "grupa_docelowa", "kto_moze_skorzystac", "opis", "organizacja")


def normalize(text: str) -> str:
    """Małe litery bez znaków diakrytycznych („ł” nie rozkłada się w NFD, więc osobno)."""
    folded = unicodedata.normalize("NFD", text.lower().replace("ł", "l"))
    return "".join(c for c in folded if not unicodedata.combining(c))


def tokens(query: str) -> list[str]:
    return [t for t in re.split(r"[^a-z0-9]+", normalize(query)) if t]


def haystack(innovation: Innovation) -> str:
    parts = (getattr(innovation, field) for field in SEARCH_FIELDS)
    return normalize(" ".join(p for p in parts if p))


def matches_token(text: str, token: str) -> bool:
    if token in text:
        return True
    # „wózek” → „wózka”, „wózków”: w odmianie „e” wypada
    if len(token) >= 5 and token.endswith("ek") and token[:-2] + "k" in text:
        return True
    # „seniorów” → „senior”, „seniorzy”: dla dłuższych słów rdzeń bez dwóch ostatnich liter
    return len(token) >= 6 and token[:-2] in text


def matches_query(text: str, query_tokens: list[str]) -> bool:
    return all(matches_token(text, t) for t in query_tokens)


def sort_key(innovation: Innovation) -> str:
    return normalize(innovation.nazwa)
