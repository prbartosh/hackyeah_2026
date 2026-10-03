import pytest

from app.api.deps import get_llm_service, get_token_budget
from app.core.config import settings
from app.main import app
from app.services.llm import LLMError
from app.services.token_budget import TokenBudget

SLUG = "kody-qr-na-pomoc-seniorom"
URL = f"/api/v1/innovations/{SLUG}/service-card"

CARD = {
    "cel": "Seniorzy z demencją łatwiej radzą sobie w domu.",
    "odbiorcy": "Seniorzy z zaburzeniami pamięci i ich opiekunowie.",
    "kroki": ["Wybór uczestników.", "Przygotowanie kodów.", "Szkolenie opiekunów."],
    "zasoby": ["Pracownik socjalny."],
    "ryzyka": ["do uzupełnienia"],
    "wskazniki_sukcesu": ["Mniej telefonów do opiekuna."],
}


class FakeLLM:
    def __init__(self, response) -> None:
        self.response = response
        self.calls: list[dict] = []

    async def complete_json(self, *, system, user, timeout):
        self.calls.append({"system": system, "user": user})
        if isinstance(self.response, Exception):
            raise self.response
        return self.response


@pytest.fixture
def llm():
    holder: dict[str, FakeLLM] = {}

    def use(response) -> FakeLLM:
        holder["llm"] = FakeLLM(response)
        app.dependency_overrides[get_llm_service] = lambda: holder["llm"]
        return holder["llm"]

    yield use
    app.dependency_overrides.pop(get_llm_service, None)
    app.dependency_overrides.pop(get_token_budget, None)


async def test_card_for_partner_with_problem(client, llm):
    fake = llm(CARD)
    payload = {
        "rola": "partner",
        "problem": {"miejsca": {"tekst": "gmina Drwinia", "slugi": []}},
    }
    response = await client.post(URL, json=payload)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["slug"] == SLUG and body["rola"] == "partner"
    assert body["karta"]["kroki"] == CARD["kroki"]
    user = fake.calls[0]["user"]
    assert "gmina Drwinia" in user
    assert f'"slug": "{SLUG}"' in user
    assert "JST" in user


async def test_card_without_problem(client, llm):
    fake = llm(CARD)
    response = await client.post(URL, json={"rola": "cus-ops"})

    assert response.status_code == 200
    assert "<problem>nie podano</problem>" in fake.calls[0]["user"]


async def test_resident_role_rejected(client, llm):
    fake = llm(CARD)
    response = await client.post(URL, json={"rola": "mieszkaniec"})

    assert response.status_code == 422
    assert fake.calls == []


async def test_unknown_innovation(client, llm):
    llm(CARD)
    response = await client.post(
        "/api/v1/innovations/nie-ma/service-card", json={"rola": "partner"}
    )
    assert response.status_code == 404


async def test_incomplete_card_from_model(client, llm):
    llm(CARD | {"kroki": ["Tylko jeden krok."]})
    response = await client.post(URL, json={"rola": "partner"})
    assert response.status_code == 502


async def test_model_error(client, llm):
    llm(LLMError("Brak połączenia z API modelu"))
    response = await client.post(URL, json={"rola": "partner"})
    assert response.status_code == 502


async def test_limits_from_chat(client, llm, monkeypatch):
    fake = llm(CARD)
    budget = TokenBudget(daily_limit=10)
    budget.add(10)
    app.dependency_overrides[get_token_budget] = lambda: budget
    response = await client.post(URL, json={"rola": "partner"})
    assert response.status_code == 503

    app.dependency_overrides.pop(get_token_budget)
    monkeypatch.setattr(settings, "chat_enabled", False)
    response = await client.post(URL, json={"rola": "partner"})
    assert response.status_code == 503
    assert fake.calls == []


async def test_missing_api_key_returns_503(client, monkeypatch):
    monkeypatch.setattr(settings, "llm_api_key", None)
    response = await client.post(URL, json={"rola": "partner"})
    assert response.status_code == 503
