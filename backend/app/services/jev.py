"""Port do modelu ocen Jev (TypeSafe System One, ADR 0016).

Serwisy znają tylko `Judge` i typy pytań niżej, nie format API. Jev zwraca typowane oceny
(prawdopodobieństwa), nie tekst: wynik to podpowiedź dla kodu, nie uprawnienie. Treść od
użytkownika w `state` może próbować sterować oceną, więc kod tylko zawęża i sortuje.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

RETRY_STATUSES = (429, 529)
RETRIES = 2


class JudgeError(Exception):
    pass


@dataclass(frozen=True)
class Noul:
    """Pytanie tak/nie. Odpowiedź: prawdopodobieństwo „tak” (0-1)."""

    instructions: Any
    true: Any = None
    false: Any = None


@dataclass(frozen=True)
class Score:
    """Ocena na uporządkowanej skali poziomów (od najniższego)."""

    instructions: Any
    levels: list[Any]


@dataclass(frozen=True)
class Choice:
    """Wybór jednej opcji: klucz -> opis (albo None)."""

    instructions: Any
    options: dict[str, Any]


Question = Noul | Score | Choice


@dataclass
class ScoreAnswer:
    score: float
    confidence: float
    top: int  # numer najwyższego poziomu (len(levels) - 1)

    @property
    def normalized(self) -> float:
        return self.score / self.top if self.top else 0.0


@dataclass
class ChoiceAnswer:
    choice: str
    probabilities: dict[str, float]
    confidence: float


@dataclass
class Answers:
    nouls: dict[str, float] = field(default_factory=dict)
    scores: dict[str, ScoreAnswer] = field(default_factory=dict)
    choices: dict[str, ChoiceAnswer] = field(default_factory=dict)
    model: str = ""
    input_tokens: int = 0


class Judge(Protocol):
    async def evaluate(self, state: Any, questions: dict[str, Question]) -> Answers: ...


def create_judge(settings: Settings) -> "Judge | None":
    if not settings.typesafe_api_key:
        return None
    return TypeSafeJudge(settings)


def _payload(question: Question) -> dict[str, Any]:
    if isinstance(question, Noul):
        body: dict[str, Any] = {"type": "noul", "instructions": question.instructions}
        if question.true is not None or question.false is not None:
            body["criteria"] = {"true": question.true, "false": question.false}
        return body
    if isinstance(question, Score):
        return {"type": "score", "instructions": question.instructions, "criteria": question.levels}
    return {"type": "choice", "instructions": question.instructions, "criteria": question.options}


def _unit(value: Any) -> float:
    if not isinstance(value, int | float):
        raise JudgeError("Jev zwrócił niepoprawną odpowiedź")
    return min(1.0, max(0.0, float(value)))


def parse_answers(raw: dict[str, Any], questions: dict[str, Question]) -> Answers:
    """Odpowiedź API -> typy portu; każde pytanie musi mieć poprawną odpowiedź."""
    answers = Answers(
        model=str(raw.get("model") or ""),
        input_tokens=int((raw.get("usage") or {}).get("input_tokens") or 0),
    )
    got = raw.get("answers")
    if not isinstance(got, dict):
        raise JudgeError("Jev zwrócił niepoprawną odpowiedź")
    for key, question in questions.items():
        answer = got.get(key)
        if not isinstance(answer, dict):
            raise JudgeError(f"Brak odpowiedzi Jeva na pytanie {key}")
        if isinstance(question, Noul):
            answers.nouls[key] = _unit(answer.get("noul"))
        elif isinstance(question, Score):
            top = len(question.levels) - 1
            score = answer.get("score")
            if not isinstance(score, int | float):
                raise JudgeError("Jev zwrócił niepoprawną odpowiedź")
            answers.scores[key] = ScoreAnswer(
                min(float(top), max(0.0, float(score))), _unit(answer.get("confidence")), top
            )
        else:
            choice = answer.get("choice")
            probabilities = answer.get("probabilities") or {}
            if choice not in question.options or not isinstance(probabilities, dict):
                raise JudgeError("Jev wybrał opcję spoza listy")
            answers.choices[key] = ChoiceAnswer(
                choice,
                {k: _unit(probabilities.get(k, 0.0)) for k in question.options},
                _unit(answer.get("confidence")),
            )
    return answers


class TypeSafeJudge:
    """Adapter HTTP API TypeSafe (`POST /v1/systemone`), ponowienia przy 429 i 529."""

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.model = settings.typesafe_model
        self.client = client or httpx.AsyncClient(
            base_url=settings.typesafe_base_url,
            headers={"Authorization": f"Bearer {settings.typesafe_api_key}"},
            timeout=settings.jev_timeout_seconds,
        )

    async def evaluate(self, state: Any, questions: dict[str, Question]) -> Answers:
        body = {
            "state": state,
            "model": self.model,
            "questions": {key: _payload(q) for key, q in questions.items()},
        }
        for attempt in range(RETRIES + 1):
            try:
                response = await self.client.post("/v1/systemone", json=body)
            except httpx.TimeoutException as e:
                raise JudgeError("Jev nie odpowiedział na czas") from e
            except httpx.HTTPError as e:
                raise JudgeError("Brak połączenia z Jevem") from e
            if response.status_code in RETRY_STATUSES and attempt < RETRIES:
                await asyncio.sleep(0.5 * 2**attempt)
                continue
            if response.status_code != 200:
                # Treść błędu bez danych zapytania (ADR 0016: w logach nie ma treści zgłoszeń).
                logger.error("Jev API error %s", response.status_code)
                raise JudgeError(f"Błąd API Jeva ({response.status_code})")
            try:
                raw = response.json()
            except ValueError as e:
                raise JudgeError("Jev zwrócił niepoprawną odpowiedź") from e
            return parse_answers(raw, questions)
        raise JudgeError("Jev: wyczerpano ponowienia")
