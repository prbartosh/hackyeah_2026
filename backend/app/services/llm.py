import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, Literal, Protocol

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
    """Koniec tury asystenta. `state` jest nieprzezroczysty dla serwisów: adapter odbiera go
    z powrotem w historii (np. rozumowanie, które dostawca musi dostać z wywołaniami narzędzi).
    """

    state: list[dict[str, Any]]


LLMEvent = TextDelta | ToolCall | TurnEnd


@dataclass
class Message:
    """Wiadomość rozmowy. `context` to zmienny dopisek do wiadomości użytkownika (po tekście)."""

    role: Literal["user", "assistant"]
    text: str
    context: str | None = None


@dataclass
class ToolResult:
    call_id: str
    content: str
    is_error: bool = False


# Historia dla `LLMProvider.stream`: wiadomości, zakończone tury asystenta i wyniki narzędzi.
HistoryItem = Message | TurnEnd | ToolResult


class LLMProvider(Protocol):
    """Port do modelu. Serwisy znają tylko ten interfejs i typy wyżej, nie format dostawcy."""

    def stream(
        self, *, system: str, tools: list[dict[str, Any]], history: list[HistoryItem]
    ) -> AsyncIterator[LLMEvent]: ...

    async def complete_json(
        self,
        *,
        system: str,
        user: str,
        timeout: float,
        schema: dict[str, Any] | None = None,
    ) -> dict[str, Any]: ...


@dataclass(frozen=True)
class ProviderProfile:
    """Różnice między dostawcami tego samego API (flagi, nie osobne klasy)."""

    # `strict` w definicjach narzędzi.
    strict_tools: bool = False
    # Nie zapisuj odpowiedzi po stronie dostawcy i odsyłaj zaszyfrowane rozumowanie.
    stateless_reasoning: bool = False
    # Nazwa parametru limitu tokenów w Chat Completions.
    json_tokens_param: str = "max_tokens"


PROFILES: dict[str, ProviderProfile] = {
    # DeepSeek ignoruje `store`, `include` i `strict`, a w Chat Completions zna tylko `max_tokens`
    # (ADR 0007).
    "deepseek": ProviderProfile(),
    # `strict` zostaje wyłączony: wymaga schematów z `additionalProperties: false` i wszystkimi
    # polami w `required`, a nasze narzędzia tego nie spełniają.
    "openai": ProviderProfile(stateless_reasoning=True, json_tokens_param="max_completion_tokens"),
}


def create_provider(settings: Settings, budget: TokenBudget | None = None) -> LLMProvider:
    profile = PROFILES.get(settings.llm_provider)
    if profile is None:
        raise ValueError(
            f"Nieznany LLM_PROVIDER: {settings.llm_provider!r} ({', '.join(PROFILES)})"
        )
    return ResponsesProvider(settings, profile, budget)


def _to_input(history: list[HistoryItem]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for item in history:
        if isinstance(item, Message):
            if item.context:
                content: Any = [
                    {"type": "input_text", "text": item.text},
                    {"type": "input_text", "text": item.context},
                ]
            else:
                content = item.text
            items.append({"role": item.role, "content": content})
        elif isinstance(item, TurnEnd):
            items.extend(item.state)
        else:
            output = f"BŁĄD: {item.content}" if item.is_error else item.content
            items.append(
                {"type": "function_call_output", "call_id": item.call_id, "output": output}
            )
    return items


class ResponsesProvider:
    """Adapter Responses API (SDK `openai`) z profilem dostawcy. Jedno wywołanie = jeden strumień
    zdarzeń. DeepSeek zwraca rozumowanie jako zwykły tekst w elemencie `reasoning` i scala je
    z wiadomością asystenta, gdy odsyłamy je w historii.
    """

    def __init__(
        self,
        settings: Settings,
        profile: ProviderProfile | None = None,
        budget: TokenBudget | None = None,
    ) -> None:
        self.settings = settings
        self.profile = profile or PROFILES["deepseek"]
        self.budget = budget
        self.client = openai.AsyncOpenAI(
            api_key=settings.llm_api_key, base_url=settings.llm_base_url
        )

    def _track(self, total_tokens: int) -> None:
        if self.budget is not None:
            self.budget.add(total_tokens)

    async def complete_json(
        self,
        *,
        system: str,
        user: str,
        timeout: float,
        schema: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        try:
            if schema is None:
                content = await self._chat_json(system, user, timeout)
            else:
                content = await self._schema_json(system, user, timeout, schema)
        except openai.APITimeoutError as e:
            raise LLMError("Model nie odpowiedział na czas") from e
        except openai.APIConnectionError as e:
            raise LLMError("Brak połączenia z API modelu") from e
        except openai.APIStatusError as e:
            logger.error("LLM API error %s: %s", e.status_code, e.message)
            raise LLMError(f"Błąd API modelu ({e.status_code})") from e
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            raise LLMError("Model zwrócił niepoprawną odpowiedź") from e
        if not isinstance(data, dict):
            raise LLMError("Model zwrócił niepoprawną odpowiedź")
        return data

    async def _chat_json(self, system: str, user: str, timeout: float) -> str:
        """Tryb `json_object` w Chat Completions (DeepSeek nie zna `json_schema` w tym API)."""
        extra: dict[str, Any] = {self.profile.json_tokens_param: 8000}
        if self.settings.llm_reasoning_effort:
            extra["reasoning_effort"] = self.settings.llm_reasoning_effort
        response = await self.client.chat.completions.create(
            model=self.settings.llm_model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            response_format={"type": "json_object"},
            timeout=timeout,
            **extra,
        )
        if response.usage:
            self._track(response.usage.total_tokens)
            logger.info(
                "LLM json: in=%s out=%s",
                response.usage.prompt_tokens,
                response.usage.completion_tokens,
            )
        return response.choices[0].message.content or ""

    async def _schema_json(
        self, system: str, user: str, timeout: float, schema: dict[str, Any]
    ) -> str:
        """Odpowiedź wg schematu przez Responses API (`text.format`)."""
        extra: dict[str, Any] = {}
        if self.settings.llm_reasoning_effort:
            extra["reasoning"] = {"effort": self.settings.llm_reasoning_effort}
        response = await self.client.responses.create(
            model=self.settings.llm_model,
            instructions=system,
            input=user,
            text={"format": {"type": "json_schema", "name": "odpowiedz", "schema": schema}},
            timeout=timeout,
            **extra,
        )
        if response.usage:
            self._track(response.usage.total_tokens)
        return response.output_text

    async def stream(
        self,
        *,
        system: str,
        tools: list[dict[str, Any]],
        history: list[HistoryItem],
    ) -> AsyncIterator[LLMEvent]:
        extra: dict[str, Any] = {}
        if self.settings.llm_reasoning_effort:
            extra["reasoning"] = {"effort": self.settings.llm_reasoning_effort}
        if self.profile.stateless_reasoning:
            extra["store"] = False
            extra["include"] = ["reasoning.encrypted_content"]

        response = None
        try:
            stream = await self.client.responses.create(
                model=self.settings.llm_model,
                max_output_tokens=self.settings.llm_max_completion_tokens,
                # System prompt z katalogiem jest stały i pierwszy - dostawca cache'uje prefiks.
                instructions=system,
                input=_to_input(history),
                tools=[_to_openai_tool(t, self.profile.strict_tools) for t in tools],
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
        except openai.OpenAIError as e:
            logger.error("LLM error: %r", e)
            raise LLMError("Błąd API modelu") from e

        if response is None:
            raise LLMError("Brak odpowiedzi modelu")
        usage = response.usage
        if usage:
            self._track(usage.total_tokens)
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

        yield TurnEnd(state=[item.model_dump(exclude_none=True) for item in response.output])


def _to_openai_tool(tool: dict[str, Any], strict: bool) -> dict[str, Any]:
    converted = {
        "type": "function",
        "name": tool["name"],
        "description": tool["description"],
        "parameters": tool["parameters"],
    }
    if strict:
        converted["strict"] = True
    return converted


def _tool_call(call_id: str, name: str, arguments: str) -> ToolCall:
    try:
        args = json.loads(arguments or "{}")
    except json.JSONDecodeError:
        logger.warning("LLM: niepoprawny JSON argumentów %s", name)
        args = {}
    if not isinstance(args, dict):
        args = {}
    return ToolCall(call_id, name, args)
