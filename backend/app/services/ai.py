"""Brama do AI dla panelu administratora: limit kosztów, timeouty, łagodne awarie (ADR 0006)."""

import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import AiUsage
from app.services.llm import LLMError, LLMProvider

logger = logging.getLogger(__name__)


class AIUnavailableError(Exception):
    """Komunikat po polsku, pokazywany pracownikowi; funkcja ma wtedy działać ręcznie."""


class AIGateway:
    def __init__(self, session: AsyncSession, settings: Settings, llm: LLMProvider | None) -> None:
        self.session = session
        self.settings = settings
        self.llm = llm
        self.degraded: str | None = None

    @property
    def _configured(self) -> bool:
        return bool(self.settings.llm_api_key) and self.llm is not None

    async def _spend(self, scope: str | None = None) -> None:
        """Zlicza wywołanie w dziennym limicie; po przekroczeniu AI jest wyłączone do jutra.

        `scope` daje osobny licznik i limit (np. publiczny Kreator pomysłów), żeby użytkownicy
        nie wyczerpali limitu panelu.
        """
        day = datetime.now(UTC).strftime("%Y-%m-%d")
        key = day if scope is None else f"{scope}:{day}"
        limit = (
            self.settings.ai_daily_call_limit
            if scope is None
            else self.settings.kreator_ai_daily_call_limit
        )
        usage = await self.session.get(AiUsage, key)
        if usage is None:
            usage = AiUsage(dzien=key, wywolania=0)
            self.session.add(usage)
        if usage.wywolania >= limit:
            raise AIUnavailableError(
                "Dzienny limit wywołań AI został wykorzystany. Spróbuj ponownie jutro."
            )
        usage.wywolania += 1
        await self.session.flush()

    async def json(self, system: str, user: str, *, scope: str | None = None) -> dict[str, Any]:
        if not self._configured or self.llm is None:
            raise AIUnavailableError("Podpowiedzi AI są wyłączone (brak klucza API modelu).")
        await self._spend(scope)
        try:
            return await self.llm.complete_json(
                system=system, user=user, timeout=self.settings.ai_timeout_seconds
            )
        except LLMError as e:
            raise AIUnavailableError(f"Podpowiedź AI nie powiodła się ({e}).") from e
