import json
from types import SimpleNamespace as NS

import pytest

from app.core.config import Settings
from app.services.llm import LLMError, LLMService, TextDelta, ToolCall, TurnEnd


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


def service(events, **settings) -> tuple[LLMService, FakeResponses]:
    llm = LLMService(Settings(database_url="x", openai_api_key="test", **settings))
    responses = FakeResponses(events)
    llm.client.responses = responses
    return llm, responses


async def collect(llm: LLMService):
    tools = [{"name": "set_role", "description": "d", "parameters": {"type": "object"}}]
    return [e async for e in llm.stream(system="SYS", tools=tools, messages=[])]


async def test_streams_text_and_tool_calls():
    args_a = json.dumps({"rola": "partner"})
    args_b = json.dumps({"text": "Ile osób?", "options": ["1", "2", "3"]})
    reasoning = Item(type="reasoning", id="rs", encrypted_content="enc", summary=[])
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
    assert [i["type"] for i in end.items] == ["reasoning", "function_call", "function_call"]
    assert end.items[0]["encrypted_content"] == "enc"

    sent = responses.kwargs
    assert sent["instructions"] == "SYS"
    assert sent["store"] is False
    assert sent["tools"][0] == {
        "type": "function",
        "name": "set_role",
        "description": "d",
        "parameters": {"type": "object"},
        "strict": True,
    }
    assert sent["reasoning"] == {"effort": "low"}
    assert sent["include"] == ["reasoning.encrypted_content"]


async def test_reasoning_effort_can_be_disabled():
    llm, responses = service([done([])], llm_reasoning_effort="")
    await collect(llm)
    assert "reasoning" not in responses.kwargs
    assert "include" not in responses.kwargs


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
