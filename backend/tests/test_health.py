import pytest

from app.api.deps import get_session
from app.core.config import settings
from app.main import app


@pytest.fixture
async def health_client(client, session_factory):
    async def override_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    yield client
    app.dependency_overrides.pop(get_session, None)


@pytest.mark.parametrize("key, llm", [("sekret", True), (None, False)])
async def test_health(health_client, monkeypatch, key, llm):
    monkeypatch.setattr(settings, "llm_api_key", key)
    response = await health_client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "llm": llm}
    assert "sekret" not in response.text
