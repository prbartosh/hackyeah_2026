"""Backend panelu do klikania lokalnie, bez Dockera i Postgresa (SQLite + dane demo).

Uruchomienie z katalogu backend:  python scripts/dev_panel.py
Token panelu: demo-token. Baza jest tworzona od nowa przy każdym starcie.
Opcjonalnie ustaw OPENAI_API_KEY, żeby przetestować AI.
"""

import asyncio
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
DB = BACKEND / "panel-dev.db"

os.chdir(BACKEND)
sys.path[:0] = [str(BACKEND), str(BACKEND / "scripts")]
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{DB.as_posix()}"
os.environ.setdefault("ADMIN_TOKEN", "demo-token")
os.environ.setdefault("CORS_ORIGINS", "[]")
DB.unlink(missing_ok=True)

import uvicorn  # noqa: E402

import app.models  # noqa: E402,F401
import seed_demo  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402


async def prepare() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_demo.main()


if __name__ == "__main__":
    asyncio.run(prepare())
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000)
