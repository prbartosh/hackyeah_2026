"""Brama do AI dla panelu administratora: limit kosztów, timeouty, łagodne awarie (ADR 0006)."""

import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import AiUsage
from app.services.embeddings import LOCAL_MODEL, local_embed
from app.services.llm import LLMError, LLMService

logger = logging.getLogger(__name__)


class AIUnavailableError(Exception):
    """Komunikat po polsku, pokazywany pracownikowi; funkcja ma wtedy działać ręcznie."""


class AIGateway:
    def __init__(self, session: AsyncSession, settings: Settings, llm: LLMService | None) -> None:
        self.session = session
        self.settings = settings
        self.llm = llm
        # Ustawiane, gdy embeddingi spadły na tryb lokalny; pokazywane w UI.
        self.degraded: str | None = None

    @property
    def embedding_model(self) -> str:
        return LOCAL_MODEL

    @property
    def _configured(self) -> bool:
        return bool(self.settings.llm_api_key) and self.llm is not None

    async def _spend(self) -> None:
        """Zlicza wywołanie w dziennym limicie; po przekroczeniu AI jest wyłączone do jutra."""
        day = datetime.now(UTC).strftime("%Y-%m-%d")
        usage = await self.session.get(AiUsage, day)
        if usage is None:
            usage = AiUsage(dzien=day, wywolania=0)
            self.session.add(usage)
        if usage.wywolania >= self.settings.ai_daily_call_limit:
            raise AIUnavailableError(
                "Dzienny limit wywołań AI został wykorzystany. Spróbuj ponownie jutro."
            )
        usage.wywolania += 1
        await self.session.flush()

    async def embed(self, texts: list[str]) -> tuple[list[list[float]], str]:
        """Wektory i nazwa modelu. Zawsze lokalnie: DeepSeek nie ma API embeddingów (ADR 0007)."""
        return [local_embed(t) for t in texts], LOCAL_MODEL

    async def json(self, system: str, user: str) -> dict[str, Any]:
        if not self._configured or self.llm is None:
            raise AIUnavailableError("Podpowiedzi AI są wyłączone (brak klucza API modelu).")
        await self._spend()
        try:
            return await self.llm.complete_json(
                system=system, user=user, timeout=self.settings.ai_timeout_seconds
            )
        except LLMError as e:
            raise AIUnavailableError(f"Podpowiedź AI nie powiodła się ({e}).") from e
