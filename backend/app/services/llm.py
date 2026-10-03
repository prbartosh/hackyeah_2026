import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import anthropic

from app.core.config import Settings

logger = logging.getLogger(__name__)

FALLBACK_BETA = "server-side-fallback-2026-07-01"


class LLMError(Exception):
    pass


@dataclass
class TextDelta:
    text: str


@dataclass
class ToolCall:
    id: str
    name: str
    input: dict[str, Any]


@dataclass
class TurnEnd:
    # Pełna treść odpowiedzi - dopisywana do historii przy kolejnym kroku pętli narzędzi.
    content: list[Any]
    stop_reason: str | None


LLMEvent = TextDelta | ToolCall | TurnEnd


class LLMService:
    """Tylko komunikacja z API modelu: jedno wywołanie = jeden strumień zdarzeń."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def stream(
        self,
        *,
        system: str,
        tools: list[dict[str, Any]],
        messages: list[dict[str, Any]],
    ) -> AsyncIterator[LLMEvent]:
        extra: dict[str, Any] = {}
        if self.settings.llm_refusal_fallback:
            extra = {"betas": [FALLBACK_BETA], "fallbacks": "default"}

        try:
            async with self.client.beta.messages.stream(
                model=self.settings.llm_model,
                max_tokens=16000,
                thinking={"type": "adaptive"},
                output_config={"effort": self.settings.llm_effort},
                # System prompt z katalogiem innowacji jest stały, więc cache'ujemy go.
                system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
                tools=tools,
                messages=messages,
                **extra,
            ) as stream:
                async for event in stream:
                    if event.type == "text":
                        yield TextDelta(event.text)
                    elif event.type == "content_block_stop":
                        block = event.content_block
                        if block.type == "tool_use":
                            yield ToolCall(block.id, block.name, dict(block.input))
                message = await stream.get_final_message()
        except anthropic.APIConnectionError as e:
            raise LLMError("Brak połączenia z API modelu") from e
        except anthropic.APIStatusError as e:
            logger.error("LLM API error %s: %s", e.status_code, e.message)
            raise LLMError(f"Błąd API modelu ({e.status_code})") from e

        logger.info(
            "LLM turn: stop=%s in=%s cache_read=%s cache_write=%s out=%s",
            message.stop_reason,
            message.usage.input_tokens,
            message.usage.cache_read_input_tokens,
            message.usage.cache_creation_input_tokens,
            message.usage.output_tokens,
        )
        if message.stop_reason == "refusal":
            raise LLMError("Model odmówił odpowiedzi")
        if message.stop_reason == "max_tokens":
            raise LLMError("Odpowiedź modelu została ucięta")
        yield TurnEnd(content=message.content, stop_reason=message.stop_reason)
