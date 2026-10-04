"""Reranking kart innowacji przez Jeva (ADR 0016).

Kandydatów wybiera `matching.py` (tagi i TF-IDF), Jev ocenia każdą parę opis-karta trzema
pytaniami w jednym zapytaniu (pary równolegle), a kod liczy wynik z wagami i odcina progiem.
Jev nie dodaje kart spoza listy kandydatów. Bez Jeva albo przy jego awarii zostaje wynik
deterministyczny z progiem z panelu.
"""

import asyncio
import hashlib
import logging
from collections import OrderedDict
from dataclasses import dataclass, field

from app.models import InnovationCard
from app.services.jev import Judge, JudgeError, Noul, Score
from app.services.matching import CardMatch

logger = logging.getLogger(__name__)

# Ilu kandydatów z `matching.py` ocenia Jev.
CANDIDATES = 8
# Wynik = WEIGHTS · (trafność 0-1, rozwiązuje, grupa). Próg dobrany na zestawie testowym
# (scripts/eval_kreator.py, jev-1.13.0): najlepszy kandydat spoza bazy dostaje do 0,27,
# najsłabsza oczekiwana karta 0,37; próg w środku tej luki.
WEIGHTS = (0.5, 0.3, 0.2)
THRESHOLD = 0.32
# Od tej wartości Noula pokazujemy powód z oceny Jeva obok etykiet tagów.
REASON_NOUL = 0.8
CACHE_SIZE = 2048

RELEVANCE_LEVELS = [
    "Innowacja dotyczy innego tematu niż potrzeba i nie pomoże w opisanej sytuacji.",
    "Innowacja dotyczy pokrewnej dziedziny, ale nie odpowiada na główną trudność z opisu potrzeby.",
    "Innowacja częściowo odpowiada na potrzebę: dotyka jej tematu, lecz pomija ważny element "
    "albo wymaga dużej adaptacji.",
    "Innowacja odpowiada na potrzebę w większości, z drobnymi różnicami w grupie, skali lub "
    "sposobie działania.",
    "Innowacja wprost odpowiada na opisaną potrzebę i główną trudność z opisu.",
]

QUESTIONS = {
    "trafnosc": Score(
        "Jak dobrze innowacja (`innowacja`) odpowiada na potrzebę opisaną w `potrzeba`?",
        RELEVANCE_LEVELS,
    ),
    "rozwiazuje": Noul(
        "Czy innowacja rozwiązuje główny problem opisany w `potrzeba`?",
        true="Innowacja odpowiada na ten sam problem.",
        false="Innowacja dotyczy innego problemu.",
    ),
    "grupa": Noul(
        "Czy osoby z `potrzeba` należą do grupy docelowej lub odbiorców innowacji "
        "(`innowacja.grupa_docelowa`, `innowacja.kto_moze_skorzystac`)?",
        true="Ta sama grupa lub wprost pasujący odbiorca.",
        false="Inna grupa odbiorców.",
    ),
}


@dataclass
class Verdict:
    score: float  # trafność 0-1 (Score podzielony przez najwyższy poziom)
    solves: float
    group: float

    @property
    def relevance(self) -> float:
        """Wagi w kodzie: zmiana wag lub progu nie wymaga ponownej oceny (composite scoring)."""
        w_score, w_solves, w_group = WEIGHTS
        return w_score * self.score + w_solves * self.solves + w_group * self.group


@dataclass
class Similar:
    card: InnovationCard
    score: float
    powody: list[str] = field(default_factory=list)


_cache: OrderedDict[str, Verdict] = OrderedDict()


def _clip(text: str | None, limit: int) -> str | None:
    if not text:
        return None
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"


def card_state(card: InnovationCard) -> dict[str, str | None]:
    """Tylko pola potrzebne do oceny (duży stan obniża trafność Jeva)."""
    return {
        "nazwa": card.nazwa,
        "problem": card.problem,
        "grupa_docelowa": card.grupa_docelowa,
        "kto_moze_skorzystac": card.kto_moze_skorzystac,
        "czy_dziala": _clip(card.czy_dziala, 500),
        "opis": _clip(card.opis, 1500),
    }


def _key(query: str, state: dict[str, str | None]) -> str:
    raw = query + "\x00" + "\x00".join(v or "" for v in state.values())
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


async def judge_card(judge: Judge, query: str, card: InnovationCard) -> Verdict:
    state = card_state(card)
    key = _key(query, state)
    if key in _cache:
        _cache.move_to_end(key)
        return _cache[key]
    answers = await judge.evaluate({"potrzeba": query, "innowacja": state}, QUESTIONS)
    verdict = Verdict(
        answers.scores["trafnosc"].normalized, answers.nouls["rozwiazuje"], answers.nouls["grupa"]
    )
    _cache[key] = verdict
    if len(_cache) > CACHE_SIZE:
        _cache.popitem(last=False)
    return verdict


async def judge_cards(
    judge: Judge, query: str, cards: list[InnovationCard], timeout: float
) -> list[Verdict] | None:
    """Oceny w kolejności kart; None przy awarii lub przekroczeniu czasu (wtedy bez Jeva)."""
    try:
        return await asyncio.wait_for(
            asyncio.gather(*(judge_card(judge, query, c) for c in cards)), timeout
        )
    except (JudgeError, TimeoutError) as e:
        logger.warning("Jev niedostępny, dopasowanie bez Jeva: %s", e)
        return None


def jev_reasons(verdict: Verdict) -> list[str]:
    reasons = []
    if verdict.solves >= REASON_NOUL:
        reasons.append("odpowiada na ten sam problem")
    if verdict.group >= REASON_NOUL:
        reasons.append("ta sama grupa odbiorców")
    return reasons


async def pick_similar(
    query: str,
    ranked: list[tuple[InnovationCard, CardMatch]],
    judge: Judge | None,
    *,
    threshold: float,
    limit: int,
    timeout: float,
) -> list[Similar]:
    """Karty do pokazania: z Jevem rerank kandydatów i jego próg, bez Jeva próg z panelu."""
    if judge is not None and ranked:
        candidates = ranked[:CANDIDATES]
        verdicts = await judge_cards(judge, query, [c for c, _ in candidates], timeout)
        if verdicts is not None:
            judged = sorted(
                zip(candidates, verdicts, strict=True), key=lambda x: x[1].relevance, reverse=True
            )
            return [
                Similar(card, round(v.relevance, 3), [*match.powody, *jev_reasons(v)])
                for (card, match), v in judged
                if v.relevance >= THRESHOLD
            ][:limit]
    return [
        Similar(card, round(match.score, 3), match.powody)
        for card, match in ranked
        if match.score >= threshold
    ][:limit]
