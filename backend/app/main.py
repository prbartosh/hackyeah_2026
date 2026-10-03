import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import get_ai_gateway
from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import SessionLocal
from app.services.cards import CardService

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    if not settings.llm_api_key:
        logger.warning("Brak LLM_API_KEY - czat odpowiada 503, panel działa bez AI")
    try:
        async with SessionLocal() as session:
            service = CardService(session, get_ai_gateway(session))
            await service.import_from_files(settings.innovations_path)
            await service.refresh_snapshot()
    except Exception:
        logger.exception("Start bez kart z bazy (działają pliki JSON)")
    yield


def configure_logging() -> None:
    """Tylko logger `app`: uvicorn i SQLAlchemy mają własne handlery, root dałby duplikaty."""
    logger = logging.getLogger("app")
    if logger.handlers:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
