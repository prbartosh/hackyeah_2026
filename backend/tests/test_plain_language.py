import pytest

from app.api.deps import get_llm_service
from app.core.config import settings
from app.main import app
from app.services import plain_language
from app.services.llm import LLMError

SLUG = "kody-qr-na-pomoc-seniorom"
URL = f"/api/v1/innovations/{SLUG}/prosty-jezyk"

TEXT = {"zdania": ["To są kody QR.", "Pomagają seniorom.", "Senior wie, co robić."]}


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

    plain_language._cache.clear()
    yield use
    app.dependency_overrides.pop(get_llm_service, None)
    plain_language._cache.clear()


async def test_plain_text_with_source(client, llm):
    fake = llm(TEXT)
    response = await client.post(URL)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["zdania"] == TEXT["zdania"]
    assert body["zrodlo"].startswith("https://")
    assert f'"slug": "{SLUG}"' in fake.calls[0]["user"]


async def test_second_request_uses_cache(client, llm):
    fake = llm(TEXT)
    await client.post(URL)
    response = await client.post(URL)

    assert response.status_code == 200
    assert len(fake.calls) == 1


async def test_unknown_innovation(client, llm):
    llm(TEXT)
    response = await client.post("/api/v1/innovations/nie-ma/prosty-jezyk")
    assert response.status_code == 404


async def test_too_short_text_from_model(client, llm):
    llm({"zdania": ["Jedno zdanie."]})
    response = await client.post(URL)
    assert response.status_code == 502


async def test_model_error(client, llm):
    llm(LLMError("Brak połączenia z API modelu"))
    response = await client.post(URL)
    assert response.status_code == 502


async def test_disabled_chat_returns_503(client, llm, monkeypatch):
    fake = llm(TEXT)
    monkeypatch.setattr(settings, "chat_enabled", False)
    response = await client.post(URL)
    assert response.status_code == 503
    assert fake.calls == []
