import json
from types import SimpleNamespace as NS

import pytest

from app.core.config import Settings
from app.services.llm import (
    PROFILES,
    LLMError,
    Message,
    ResponsesProvider,
    TextDelta,
    ToolCall,
    ToolResult,
    TurnEnd,
    create_provider,
)
from app.services.token_budget import TokenBudget


class Item(NS):
    def model_dump(self, exclude_none=False):
        return {k: v for k, v in vars(self).items() if not (exclude_none and v is None)}


def text(delta: str) -> NS:
    return NS(type="response.output_text.delta", delta=delta)


def function_call(call_id: str, name: str, arguments: str) -> NS:
    item = Item(type="function_call", call_id=call_id, name=name, arguments=arguments)
    return NS(type="response.output_item.done", item=item)


def done(output: list, status: str = "completed", reason: str | None = None) -> NS:
    response = NS(
        status=status,
        output=output,
        usage=None,
        incomplete_details=NS(reason=reason) if reason else None,
    )
    return NS(type=f"response.{status}", response=response)


class FakeResponses:
    def __init__(self, events):
        self.events = events
        self.kwargs = None

    async def create(self, **kwargs):
        self.kwargs = kwargs

        async def gen():
            for e in self.events:
                yield e

        return gen()


def service(events, profile="deepseek", **settings) -> tuple[ResponsesProvider, FakeResponses]:
    llm = create_provider(Settings(database_url="x", llm_api_key="test", **settings))
    llm.profile = PROFILES[profile]
    responses = FakeResponses(events)
    llm.client.responses = responses
    return llm, responses


async def collect(llm: ResponsesProvider, history=None):
    tools = [{"name": "set_role", "description": "d", "parameters": {"type": "object"}}]
    return [e async for e in llm.stream(system="SYS", tools=tools, history=history or [])]


async def test_streams_text_and_tool_calls():
    args_a = json.dumps({"rola": "partner"})
    args_b = json.dumps({"text": "Ile osób?", "options": ["1", "2", "3"]})
    reasoning = Item(
        type="reasoning", id="rs", content=[{"type": "reasoning_text", "text": "myślę"}]
    )
    call_a = function_call("a", "set_role", args_a)
    call_b = function_call("b", "ask_question", args_b)
    llm, responses = service(
        [
            text("Rozumiem."),
            call_a,
            call_b,
            done([reasoning, call_a.item, call_b.item]),
        ]
    )
    events = await collect(llm)

    assert events[0] == TextDelta("Rozumiem.")
    assert events[1] == ToolCall("a", "set_role", {"rola": "partner"})
    assert events[2] == ToolCall("b", "ask_question", json.loads(args_b))
    end = events[3]
    assert isinstance(end, TurnEnd)
    # Rozumowanie wraca do historii razem z wywołaniami narzędzi.
    assert [i["type"] for i in end.state] == ["reasoning", "function_call", "function_call"]
    assert end.state[0]["content"][0]["text"] == "myślę"

    sent = responses.kwargs
    assert sent["instructions"] == "SYS"
    assert sent["tools"][0] == {
        "type": "function",
        "name": "set_role",
        "description": "d",
        "parameters": {"type": "object"},
    }
    assert sent["reasoning"] == {"effort": "low"}


async def test_reasoning_effort_can_be_disabled():
    llm, responses = service([done([])], llm_reasoning_effort="")
    await collect(llm)
    assert "reasoning" not in responses.kwargs


@pytest.mark.parametrize("reason", ["max_output_tokens", "content_filter"])
async def test_incomplete_response_raises(reason):
    llm, _ = service([text("x"), done([], status="incomplete", reason=reason)])
    with pytest.raises(LLMError):
        await collect(llm)


async def test_failed_response_raises():
    failed = NS(type="response.failed", response=NS(error=NS(code="server_error")))
    llm, _ = service([failed])
    with pytest.raises(LLMError):
        await collect(llm)


async def test_invalid_tool_json_gives_empty_args():
    call = function_call("a", "set_role", "{nie json")
    llm, _ = service([call, done([call.item])])
    events = await collect(llm)
    assert events[0] == ToolCall("a", "set_role", {})


async def test_usage_is_added_to_budget():
    end = done([])
    end.response.usage = NS(
        input_tokens=70, output_tokens=30, total_tokens=100, input_tokens_details=None
    )
    llm, responses = service([end])
    llm.budget = TokenBudget(daily_limit=150)
    await collect(llm)
    await collect(llm)

    assert responses.kwargs["max_output_tokens"] == 8000
    assert llm.budget.used == 200
    assert llm.budget.exhausted()


async def test_history_is_converted_to_responses_input():
    llm, responses = service([done([])])
    history = [
        Message("user", "Cześć", context="<stan_rozmowy>x</stan_rozmowy>"),
        TurnEnd(state=[{"type": "function_call", "call_id": "a", "name": "set_role"}]),
        ToolResult("a", "ok"),
        ToolResult("b", "zły slug", is_error=True),
        Message("assistant", "Dobrze."),
    ]
    await collect(llm, history)

    assert responses.kwargs["input"] == [
        {
            "role": "user",
            "content": [
                {"type": "input_text", "text": "Cześć"},
                {"type": "input_text", "text": "<stan_rozmowy>x</stan_rozmowy>"},
            ],
        },
        {"type": "function_call", "call_id": "a", "name": "set_role"},
        {"type": "function_call_output", "call_id": "a", "output": "ok"},
        {"type": "function_call_output", "call_id": "b", "output": "BŁĄD: zły slug"},
        {"role": "assistant", "content": "Dobrze."},
    ]


async def test_deepseek_profile_sends_no_provider_specific_flags():
    llm, responses = service([done([])])
    await collect(llm)
    assert "store" not in responses.kwargs
    assert "include" not in responses.kwargs
    assert "strict" not in responses.kwargs["tools"][0]


async def test_openai_profile_is_stateless_with_encrypted_reasoning():
    llm, responses = service([done([])], profile="openai")
    await collect(llm)
    assert responses.kwargs["store"] is False
    assert responses.kwargs["include"] == ["reasoning.encrypted_content"]


def test_unknown_provider_is_rejected():
    with pytest.raises(ValueError):
        create_provider(Settings(database_url="x", llm_api_key="k", llm_provider="nieznany"))
