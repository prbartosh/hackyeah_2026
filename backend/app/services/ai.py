"""Brama do AI dla panelu administratora: timeouty, łagodne awarie (ADR 0006)."""

import logging
from typing import Any

from app.core.config import Settings
from app.services.embeddings import LOCAL_MODEL, local_embed
from app.services.llm import LLMError, LLMService

logger = logging.getLogger(__name__)


class AIUnavailableError(Exception):
    """Komunikat po polsku, pokazywany pracownikowi; funkcja ma wtedy działać ręcznie."""


class AIGateway:
    def __init__(self, settings: Settings, llm: LLMService | None) -> None:
        self.settings = settings
        self.llm = llm
        self.degraded: str | None = None

    @property
    def embedding_model(self) -> str:
        return LOCAL_MODEL

    @property
    def _configured(self) -> bool:
        return bool(self.settings.llm_api_key) and self.llm is not None

    async def embed(self, texts: list[str]) -> tuple[list[list[float]], str]:
        """Wektory i nazwa modelu. Zawsze lokalnie: DeepSeek nie ma API embeddingów (ADR 0007)."""
        return [local_embed(t) for t in texts], LOCAL_MODEL

    async def json(self, system: str, user: str) -> dict[str, Any]:
        if not self._configured or self.llm is None:
            raise AIUnavailableError("Podpowiedzi AI są wyłączone (brak klucza API modelu).")
        try:
            return await self.llm.complete_json(
                system=system, user=user, timeout=self.settings.ai_timeout_seconds
            )
        except LLMError as e:
            raise AIUnavailableError(f"Podpowiedź AI nie powiodła się ({e}).") from e
