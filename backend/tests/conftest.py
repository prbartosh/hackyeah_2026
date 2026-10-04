import logging
import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://app:app@db:5432/app")

from typing import Annotated

import pytest
from fastapi import Depends
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.deps import get_ai_gateway, get_session
from app.core.config import settings
from app.db.base import Base
from app.main import app
from app.repositories.innovation import set_db_snapshot
from app.services.ai import AIGateway
from app.services.email import LogEmailSender

ADMIN_TOKEN = "test-admin-token"


@pytest.fixture(autouse=True)
def email_outbox_in_log(request, monkeypatch):
    """Testy czytają e-maile z logu; prawdziwy stub nie loguje payloadu (test_security)."""
    if request.module.__name__.endswith("test_security"):
        return
    logger = logging.getLogger("app.services.email")

    async def send(self, to, subject, body):
        logger.info("E-mail (stub) od %s do %s: %s\n%s", self.sender, to, subject, body)

    monkeypatch.setattr(LogEmailSender, "send", send)


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
async def session_factory():
    engine = create_async_engine(
        "sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    yield factory
    await engine.dispose()


class FakeLLM:
    def __init__(self) -> None:
        self.json_response: dict | Exception = {}
        self.json_calls: list[dict] = []

    async def complete_json(self, *, system, user, timeout, schema=None):
        self.json_calls.append({"system": system, "user": user})
        if isinstance(self.json_response, Exception):
            raise self.json_response
        return self.json_response


@pytest.fixture
def fake_llm():
    return FakeLLM()


@pytest.fixture
def ai_enabled(monkeypatch, fake_llm):
    """Bez tego panel działa w trybie lokalnym."""
    monkeypatch.setattr(settings, "llm_api_key", "test-key")
    return fake_llm


@pytest.fixture
async def admin_client(session_factory, fake_llm, monkeypatch):
    monkeypatch.setattr(settings, "admin_token", ADMIN_TOKEN)
    monkeypatch.setattr(settings, "llm_api_key", None)

    async def override_session():
        async with session_factory() as session:
            yield session

    def override_gateway(session: Annotated[AsyncSession, Depends(get_session)]) -> AIGateway:
        return AIGateway(settings, fake_llm if settings.llm_api_key else None)

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_ai_gateway] = override_gateway
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
    ) as c:
        yield c
    app.dependency_overrides.clear()
    set_db_snapshot({})
