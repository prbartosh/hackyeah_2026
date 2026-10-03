import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://app:app@db:5432/app")

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
