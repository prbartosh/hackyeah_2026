from app.core.config import settings


async def test_admin_session_disabled_by_default(client, monkeypatch):
    monkeypatch.setattr(settings, "admin_token", "sekret")
    monkeypatch.setattr(settings, "demo_tour_enabled", False)
    response = await client.post("/api/v1/demo/admin-session")
    assert response.status_code == 404
    assert "sekret" not in response.text


async def test_admin_session_without_admin_token(client, monkeypatch):
    monkeypatch.setattr(settings, "admin_token", None)
    monkeypatch.setattr(settings, "demo_tour_enabled", True)
    response = await client.post("/api/v1/demo/admin-session")
    assert response.status_code == 404


async def test_admin_session_returns_token_when_enabled(client, monkeypatch):
    monkeypatch.setattr(settings, "admin_token", "sekret")
    monkeypatch.setattr(settings, "demo_tour_enabled", True)
    response = await client.post("/api/v1/demo/admin-session")
    assert response.status_code == 200
    assert response.json() == {"token": "sekret"}
