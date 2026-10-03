from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import SessionDep
from app.core.config import settings

router = APIRouter()


@router.get("")
async def health(session: SessionDep) -> dict[str, str | bool]:
    await session.execute(text("SELECT 1"))
    # Tylko czy klucz jest ustawiony - bez samego klucza.
    return {"status": "ok", "llm": bool(settings.llm_api_key)}
