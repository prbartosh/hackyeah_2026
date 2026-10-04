"""Adapter Jeva (ADR 0016): format API, walidacja odpowiedzi, ponowienia. Bez sieci."""

import json

import httpx
import pytest

from app.core.config import Settings
from app.services.jev import (
    Choice,
    JudgeError,
    Noul,
    Score,
    TypeSafeJudge,
    create_judge,
    parse_answers,
)

QUESTIONS = {
    "rozwiazuje": Noul("Czy rozwiązuje?", true="tak", false="nie"),
    "trafnosc": Score("Jak trafna?", ["słabo", "średnio", "dobrze"]),
    "kategoria": Choice("Która kategoria?", {"seniorzy": None, "dzieci": "Dla dzieci"}),
}

GOOD = {
    "model": "jev-1.13.0",
    "answers": {
        "rozwiazuje": {"type": "noul", "noul": 0.9},
        "trafnosc": {"type": "score", "score": 1.5, "confidence": 0.4},
        "kategoria": {
            "type": "choice",
            "choice": "dzieci",
            "probabilities": {"seniorzy": 0.2, "dzieci": 0.8},
            "confidence": 0.6,
        },
    },
    "usage": {"input_tokens": 321, "output_tokens": 20},
}


def settings(**changes) -> Settings:
    return Settings(database_url="sqlite://", typesafe_api_key="klucz-testowy", **changes)


def judge_with(handler) -> TypeSafeJudge:
    client = httpx.AsyncClient(
        base_url="https://api.typesafe.test", transport=httpx.MockTransport(handler)
    )
    return TypeSafeJudge(settings(), client)


def test_bez_klucza_nie_ma_jeva():
    assert create_judge(Settings(database_url="sqlite://", typesafe_api_key=None)) is None
    assert create_judge(settings()) is not None


def test_odpowiedz_mapowana_na_typy_portu():
    answers = parse_answers(GOOD, QUESTIONS)
    assert answers.nouls["rozwiazuje"] == 0.9
    assert answers.scores["trafnosc"].normalized == 0.75
    assert answers.choices["kategoria"].choice == "dzieci"
    assert answers.model == "jev-1.13.0"
    assert answers.input_tokens == 321


def test_wartosci_poza_zakresem_sa_przycinane():
    raw = json.loads(json.dumps(GOOD))
    raw["answers"]["rozwiazuje"]["noul"] = 1.7
    raw["answers"]["trafnosc"]["score"] = 9
    answers = parse_answers(raw, QUESTIONS)
    assert answers.nouls["rozwiazuje"] == 1.0
    assert answers.scores["trafnosc"].normalized == 1.0


def test_opcja_spoza_listy_i_brak_odpowiedzi_to_blad():
    raw = json.loads(json.dumps(GOOD))
    raw["answers"]["kategoria"]["choice"] = "wymyslona"
    with pytest.raises(JudgeError):
        parse_answers(raw, QUESTIONS)
    del raw["answers"]["kategoria"]
    with pytest.raises(JudgeError):
        parse_answers(raw, QUESTIONS)


async def test_zapytanie_w_formacie_api():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json=GOOD)

    await judge_with(handler).evaluate({"potrzeba": "x"}, QUESTIONS)
    body = seen["body"]
    assert seen["url"].endswith("/v1/systemone")
    assert body["model"] == "jev-latest"
    assert body["state"] == {"potrzeba": "x"}
    assert body["questions"]["rozwiazuje"] == {
        "type": "noul",
        "instructions": "Czy rozwiązuje?",
        "criteria": {"true": "tak", "false": "nie"},
    }
    assert body["questions"]["trafnosc"]["criteria"] == ["słabo", "średnio", "dobrze"]
    assert body["questions"]["kategoria"]["type"] == "choice"


async def test_ponowienie_po_429(monkeypatch):
    monkeypatch.setattr("app.services.jev.asyncio.sleep", _no_sleep)
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        return httpx.Response(429) if len(calls) == 1 else httpx.Response(200, json=GOOD)

    answers = await judge_with(handler).evaluate("x", QUESTIONS)
    assert len(calls) == 2
    assert answers.nouls["rozwiazuje"] == 0.9


async def test_bledy_api_i_sieci_to_judge_error(monkeypatch):
    monkeypatch.setattr("app.services.jev.asyncio.sleep", _no_sleep)
    with pytest.raises(JudgeError, match="401"):
        await judge_with(lambda r: httpx.Response(401)).evaluate("x", QUESTIONS)
    with pytest.raises(JudgeError, match="529"):
        await judge_with(lambda r: httpx.Response(529)).evaluate("x", QUESTIONS)

    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("za długo", request=request)

    with pytest.raises(JudgeError, match="na czas"):
        await judge_with(timeout).evaluate("x", QUESTIONS)


async def _no_sleep(_seconds: float) -> None:
    return None
