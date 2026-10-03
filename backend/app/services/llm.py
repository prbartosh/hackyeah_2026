import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import openai

from app.core.config import Settings
from app.services.token_budget import TokenBudget

logger = logging.getLogger(__name__)


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
    # Wiadomość asystenta w formacie API - dopisywana do historii w pętli narzędzi.
    message: dict[str, Any]


LLMEvent = TextDelta | ToolCall | TurnEnd


def tool_result_message(tool_call_id: str, content: str, is_error: bool) -> dict[str, Any]:
    if is_error:
        content = f"BŁĄD: {content}"
    return {"role": "tool", "tool_call_id": tool_call_id, "content": content}


class LLMService:
    """Tylko komunikacja z API modelu (OpenAI): jedno wywołanie = jeden strumień zdarzeń."""

    def __init__(self, settings: Settings, budget: TokenBudget | None = None) -> None:
        self.settings = settings
        self.budget = budget
        self.client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

    async def stream(
        self,
        *,
        system: str,
        tools: list[dict[str, Any]],
        messages: list[dict[str, Any]],
    ) -> AsyncIterator[LLMEvent]:
        extra: dict[str, Any] = {}
        if self.settings.llm_reasoning_effort:
            extra["reasoning_effort"] = self.settings.llm_reasoning_effort

        text: list[str] = []
        # Wywołania narzędzi przychodzą we fragmentach, indeksowane pozycją w odpowiedzi.
        calls: dict[int, dict[str, str]] = {}
        emitted: set[int] = set()
        finish_reason: str | None = None
        usage = None

        try:
            stream = await self.client.chat.completions.create(
                model=self.settings.llm_model,
                max_completion_tokens=self.settings.llm_max_completion_tokens,
                # System prompt z katalogiem jest stały i pierwszy - OpenAI cache'uje prefiks sam.
                messages=[{"role": "system", "content": system}, *messages],
                tools=[_to_openai_tool(t) for t in tools],
                stream=True,
                stream_options={"include_usage": True},
                **extra,
            )
            async for chunk in stream:
                if chunk.usage:
                    usage = chunk.usage
                if not chunk.choices:
                    continue
                choice = chunk.choices[0]
                delta = choice.delta
                if delta.content:
                    text.append(delta.content)
                    yield TextDelta(delta.content)
                for part in delta.tool_calls or []:
                    # Nowy indeks = poprzednie wywołania są kompletne.
                    for index in sorted(calls):
                        if index < part.index and index not in emitted:
                            emitted.add(index)
                            yield _tool_call(calls[index])
                    call = calls.setdefault(part.index, {"id": "", "name": "", "arguments": ""})
                    if part.id:
                        call["id"] = part.id
                    if part.function and part.function.name:
                        call["name"] += part.function.name
                    if part.function and part.function.arguments:
                        call["arguments"] += part.function.arguments
                if choice.finish_reason:
                    finish_reason = choice.finish_reason
        except openai.APIConnectionError as e:
            raise LLMError("Brak połączenia z API modelu") from e
        except openai.APIStatusError as e:
            logger.error("LLM API error %s: %s", e.status_code, e.message)
            raise LLMError(f"Błąd API modelu ({e.status_code})") from e

        if usage:
            if self.budget is not None:
                self.budget.add(usage.total_tokens)
            cached = usage.prompt_tokens_details.cached_tokens if usage.prompt_tokens_details else 0
            logger.info(
                "LLM turn: finish=%s in=%s cached=%s out=%s",
                finish_reason,
                usage.prompt_tokens,
                cached,
                usage.completion_tokens,
            )
        if finish_reason == "length":
            raise LLMError("Odpowiedź modelu została ucięta")
        if finish_reason == "content_filter":
            raise LLMError("Model odmówił odpowiedzi")

        for index in sorted(calls):
            if index not in emitted:
                yield _tool_call(calls[index])

        message: dict[str, Any] = {"role": "assistant", "content": "".join(text) or None}
        if calls:
            message["tool_calls"] = [
                {
                    "id": c["id"],
                    "type": "function",
                    "function": {"name": c["name"], "arguments": c["arguments"]},
                }
                for _, c in sorted(calls.items())
            ]
        yield TurnEnd(message=message)


def _to_openai_tool(tool: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": tool["name"],
            "description": tool["description"],
            "parameters": tool["parameters"],
            "strict": True,
        },
    }


def _tool_call(call: dict[str, str]) -> ToolCall:
    try:
        args = json.loads(call["arguments"] or "{}")
    except json.JSONDecodeError:
        logger.warning("LLM: niepoprawny JSON argumentów %s", call["name"])
        args = {}
    if not isinstance(args, dict):
        args = {}
    return ToolCall(call["id"], call["name"], args)
