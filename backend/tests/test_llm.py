import json

import pytest
from openai.types.chat import ChatCompletionChunk

from app.core.config import Settings
from app.services.llm import LLMError, LLMService, TextDelta, ToolCall, TurnEnd
from app.services.token_budget import TokenBudget


def chunk(delta: dict, finish_reason: str | None = None) -> ChatCompletionChunk:
    return ChatCompletionChunk.model_validate(
        {
            "id": "c",
            "object": "chat.completion.chunk",
            "created": 0,
            "model": "m",
            "choices": [{"index": 0, "delta": delta, "finish_reason": finish_reason}],
        }
    )


def tool_delta(index: int, *, id=None, name=None, arguments=None) -> dict:
    function = {k: v for k, v in {"name": name, "arguments": arguments}.items() if v is not None}
    part = {"index": index, "type": "function", "function": function}
    if id:
        part["id"] = id
    return {"tool_calls": [part]}


class FakeCompletions:
    def __init__(self, chunks):
        self.chunks = chunks
        self.kwargs = None

    async def create(self, **kwargs):
        self.kwargs = kwargs

        async def gen():
            for c in self.chunks:
                yield c

        return gen()


def service(chunks, **settings) -> tuple[LLMService, FakeCompletions]:
    llm = LLMService(Settings(database_url="x", openai_api_key="test", **settings))
    completions = FakeCompletions(chunks)
    llm.client.chat.completions = completions
    return llm, completions


async def collect(llm: LLMService):
    tools = [{"name": "set_role", "description": "d", "parameters": {"type": "object"}}]
    return [e async for e in llm.stream(system="SYS", tools=tools, messages=[])]


async def test_assembles_text_and_streamed_tool_calls():
    args_a = json.dumps({"rola": "partner"})
    args_b = json.dumps({"text": "Ile osób?", "options": ["1", "2", "3"]})
    llm, completions = service(
        [
            chunk({"role": "assistant", "content": "Rozumiem."}),
            chunk(tool_delta(0, id="a", name="set_role", arguments=args_a[:5])),
            chunk(tool_delta(0, arguments=args_a[5:])),
            chunk(tool_delta(1, id="b", name="ask_question", arguments=args_b)),
            chunk({}, finish_reason="tool_calls"),
        ]
    )
    events = await collect(llm)

    assert events[0] == TextDelta("Rozumiem.")
    assert events[1] == ToolCall("a", "set_role", {"rola": "partner"})
    assert events[2] == ToolCall("b", "ask_question", json.loads(args_b))
    end = events[3]
    assert isinstance(end, TurnEnd)
    assert end.message["content"] == "Rozumiem."
    assert [c["id"] for c in end.message["tool_calls"]] == ["a", "b"]
    assert end.message["tool_calls"][0]["function"]["arguments"] == args_a

    sent = completions.kwargs
    assert sent["messages"][0] == {"role": "system", "content": "SYS"}
    assert sent["tools"][0]["type"] == "function"
    assert sent["tools"][0]["function"]["strict"] is True
    assert sent["reasoning_effort"] == "low"


async def test_reasoning_effort_can_be_disabled():
    llm, completions = service([chunk({}, finish_reason="stop")], llm_reasoning_effort="")
    await collect(llm)
    assert "reasoning_effort" not in completions.kwargs


@pytest.mark.parametrize("reason", ["length", "content_filter"])
async def test_bad_finish_reason_raises(reason):
    llm, _ = service([chunk({"content": "x"}, finish_reason=reason)])
    with pytest.raises(LLMError):
        await collect(llm)


async def test_invalid_tool_json_gives_empty_args():
    llm, _ = service(
        [
            chunk(tool_delta(0, id="a", name="set_role", arguments="{nie json")),
            chunk({}, finish_reason="tool_calls"),
        ]
    )
    events = await collect(llm)
    assert events[0] == ToolCall("a", "set_role", {})


async def test_usage_is_added_to_budget():
    usage_chunk = ChatCompletionChunk.model_validate(
        {
            "id": "c",
            "object": "chat.completion.chunk",
            "created": 0,
            "model": "m",
            "choices": [],
            "usage": {"prompt_tokens": 70, "completion_tokens": 30, "total_tokens": 100},
        }
    )
    llm, completions = service([chunk({}, finish_reason="stop"), usage_chunk])
    llm.budget = TokenBudget(daily_limit=150)
    await collect(llm)
    await collect(llm)

    assert completions.kwargs["max_completion_tokens"] == 8000
    assert llm.budget.used == 200
    assert llm.budget.exhausted()
