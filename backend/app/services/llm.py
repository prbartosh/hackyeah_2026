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
    # Elementy odpowiedzi w formacie Responses API (rozumowanie, tekst, wywołania narzędzi)
    # - dopisywane do historii w pętli narzędzi.
    items: list[dict[str, Any]]


LLMEvent = TextDelta | ToolCall | TurnEnd


def tool_result_message(tool_call_id: str, content: str, is_error: bool) -> dict[str, Any]:
    if is_error:
        content = f"BŁĄD: {content}"
    return {"type": "function_call_output", "call_id": tool_call_id, "output": content}


class LLMService:
    """Tylko komunikacja z API modelu (OpenAI Responses): jedno wywołanie = jeden strumień zdarzeń.

    Responses API, bo Chat Completions nie pozwala łączyć narzędzi z reasoning_effort.
    """

    def __init__(self, settings: Settings, budget: TokenBudget | None = None) -> None:
        self.settings = settings
        self.budget = budget
        self.client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

    async def complete_json(self, *, system: str, user: str, timeout: float) -> dict[str, Any]:
        """Jedno wywołanie bez strumienia, odpowiedź jako obiekt JSON (panel administratora)."""
        extra: dict[str, Any] = {}
        if self.settings.llm_reasoning_effort:
            extra["reasoning_effort"] = self.settings.llm_reasoning_effort
        try:
            response = await self.client.chat.completions.create(
                model=self.settings.llm_model,
                max_completion_tokens=8000,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                response_format={"type": "json_object"},
                timeout=timeout,
                **extra,
            )
        except openai.APITimeoutError as e:
            raise LLMError("Model nie odpowiedział na czas") from e
        except openai.APIConnectionError as e:
            raise LLMError("Brak połączenia z API modelu") from e
        except openai.APIStatusError as e:
            logger.error("LLM API error %s: %s", e.status_code, e.message)
            raise LLMError(f"Błąd API modelu ({e.status_code})") from e
        content = response.choices[0].message.content or ""
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            raise LLMError("Model zwrócił niepoprawną odpowiedź") from e
        if not isinstance(data, dict):
            raise LLMError("Model zwrócił niepoprawną odpowiedź")
        return data

    async def embed(self, texts: list[str], *, timeout: float) -> list[list[float]]:
        try:
            response = await self.client.embeddings.create(
                model=self.settings.embedding_model, input=texts, timeout=timeout
            )
        except openai.APITimeoutError as e:
            raise LLMError("Model nie odpowiedział na czas") from e
        except openai.APIConnectionError as e:
            raise LLMError("Brak połączenia z API modelu") from e
        except openai.APIStatusError as e:
            logger.error("Embeddings API error %s: %s", e.status_code, e.message)
            raise LLMError(f"Błąd API modelu ({e.status_code})") from e
        return [item.embedding for item in sorted(response.data, key=lambda d: d.index)]

    async def stream(
        self,
        *,
        system: str,
        tools: list[dict[str, Any]],
        messages: list[dict[str, Any]],
    ) -> AsyncIterator[LLMEvent]:
        extra: dict[str, Any] = {}
        if self.settings.llm_reasoning_effort:
            extra["reasoning"] = {"effort": self.settings.llm_reasoning_effort}
            # store=False: rozumowanie wraca zaszyfrowane i odsyłamy je w historii.
            extra["include"] = ["reasoning.encrypted_content"]

        response = None
        try:
            stream = await self.client.responses.create(
                model=self.settings.llm_model,
                max_output_tokens=self.settings.llm_max_completion_tokens,
                # System prompt z katalogiem jest stały i pierwszy - OpenAI cache'uje prefiks sam.
                instructions=system,
                input=messages,
                tools=[_to_openai_tool(t) for t in tools],
                store=False,
                stream=True,
                **extra,
            )
            async for event in stream:
                if event.type == "response.output_text.delta":
                    yield TextDelta(event.delta)
                elif event.type == "response.output_item.done":
                    if event.item.type == "function_call":
                        yield _tool_call(event.item.call_id, event.item.name, event.item.arguments)
                elif event.type in ("response.completed", "response.incomplete"):
                    response = event.response
                elif event.type == "response.failed":
                    error = event.response.error
                    logger.error("LLM response failed: %s", error)
                    raise LLMError("Błąd API modelu")
                elif event.type == "error":
                    logger.error("LLM stream error %s: %s", event.code, event.message)
                    raise LLMError("Błąd API modelu")
        except openai.APIConnectionError as e:
            raise LLMError("Brak połączenia z API modelu") from e
        except openai.APIStatusError as e:
            logger.error("LLM API error %s: %s", e.status_code, e.message)
            raise LLMError(f"Błąd API modelu ({e.status_code})") from e

        if response is None:
            raise LLMError("Brak odpowiedzi modelu")
        usage = response.usage
        if usage:
            if self.budget is not None:
                self.budget.add(usage.total_tokens)
            cached = usage.input_tokens_details.cached_tokens if usage.input_tokens_details else 0
            logger.info(
                "LLM turn: status=%s in=%s cached=%s out=%s",
                response.status,
                usage.input_tokens,
                cached,
                usage.output_tokens,
            )
        if response.status == "incomplete":
            reason = response.incomplete_details.reason if response.incomplete_details else None
            if reason == "content_filter":
                raise LLMError("Model odmówił odpowiedzi")
            raise LLMError("Odpowiedź modelu została ucięta")

        yield TurnEnd(items=[item.model_dump(exclude_none=True) for item in response.output])


def _to_openai_tool(tool: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "function",
        "name": tool["name"],
        "description": tool["description"],
        "parameters": tool["parameters"],
        "strict": True,
    }


def _tool_call(call_id: str, name: str, arguments: str) -> ToolCall:
    try:
        args = json.loads(arguments or "{}")
    except json.JSONDecodeError:
        logger.warning("LLM: niepoprawny JSON argumentów %s", name)
        args = {}
    if not isinstance(args, dict):
        args = {}
    return ToolCall(call_id, name, args)
