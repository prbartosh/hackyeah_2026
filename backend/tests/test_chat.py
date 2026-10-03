import json
from typing import Any

import pytest
from sqlalchemy import select

from app.api.deps import get_llm_service, get_session_factory, get_token_budget
from app.core.config import settings
from app.main import app
from app.models import Potrzeba
from app.services.chat import LLM_UNAVAILABLE, NoteFilter
from app.services.llm import LLMError, TextDelta, ToolCall, TurnEnd
from app.services.token_budget import TokenBudget

MAIN = "kody-qr-na-pomoc-seniorom"
OTHER = "bawita"


class FakeLLM:
    def __init__(self, turns: list[list[Any]]) -> None:
        self.turns = turns
        self.calls: list[list[dict[str, Any]]] = []

    async def stream(self, *, system, tools, messages):
        self.calls.append(json.loads(json.dumps(messages, default=str)))
        events = self.turns.pop(0)
        if isinstance(events, Exception):
            raise events
        for event in events:
            yield event
        items = [
            {
                "type": "function_call",
                "call_id": e.id,
                "name": e.name,
                "arguments": json.dumps(e.input),
            }
            for e in events
            if isinstance(e, ToolCall)
        ]
        yield TurnEnd(items=items)


def tool(name: str, **args) -> ToolCall:
    return ToolCall(id=f"t-{name}", name=name, input=args)


def empty_problem(**fields) -> dict:
    keys = ["grupy_docelowe", "problemy", "miejsca", "skale", "zasoby", "proby"]
    fields = {k: {"tekst": v, "slugi": ["zmyslony-slug"]} for k, v in fields.items()}
    return {k: fields.get(k) for k in keys}


@pytest.fixture
def fake_llm():
    holder: dict[str, FakeLLM] = {}

    def use(turns):
        holder["llm"] = FakeLLM(turns)
        app.dependency_overrides[get_llm_service] = lambda: holder["llm"]
        return holder["llm"]

    yield use
    app.dependency_overrides.pop(get_llm_service, None)


@pytest.fixture(autouse=True)
def sessions(session_factory):
    app.dependency_overrides[get_session_factory] = lambda: session_factory
    yield session_factory
    app.dependency_overrides.pop(get_session_factory, None)


def parse_sse(body: str) -> list[tuple[str, dict]]:
    events = []
    for chunk in body.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in chunk.splitlines())
        events.append((lines["event"], json.loads(lines["data"])))
    return events


async def post(client, payload) -> list[tuple[str, dict]]:
    response = await client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/event-stream")
    return parse_sse(response.text)


def first_message(text="Mama ma demencję i dzwoni do mnie 10 razy dziennie"):
    return {"messages": [{"role": "user", "content": text}]}


async def test_first_turn_sets_role_problem_and_asks(client, fake_llm):
    fake_llm(
        [
            [
                TextDelta("Rozumiem."),
                tool("set_role", rola="mieszkaniec"),
                tool("update_problem", **empty_problem(grupy_docelowe="mama z demencją")),
                tool(
                    "ask_question", text="Gdzie mieszka mama?", options=["sama", "ze mną", "w DPS"]
                ),
            ]
        ]
    )
    events = await post(client, first_message())

    names = [n for n, _ in events]
    assert names == ["text", "role", "problem_update", "question", "done"]
    assert events[1][1] == {"rola": "mieszkaniec"}
    assert events[2][1]["problem"]["grupy_docelowe"] == {"tekst": "mama z demencją", "slugi": []}
    done = events[-1][1]
    assert done["state"]["rounds"] == 1
    assert done["state"]["rola"] == "mieszkaniec"
    assert "Rozumiem." in done["assistant_message"]
    assert "[Pytanie: Gdzie mieszka mama?" in done["assistant_message"]


async def test_problem_update_merges_with_state(client, fake_llm):
    fake_llm(
        [
            [
                tool("update_problem", **empty_problem(miejsca="Wieliczka")),
                tool("propose_summary", summary="Mama potrzebuje wsparcia."),
            ]
        ]
    )
    payload = first_message() | {
        "state": {"grupy_docelowe": {"tekst": "mama", "slugi": []}, "rounds": 2}
    }
    events = await post(client, payload)

    problem = dict(events)["problem_update"]["problem"]
    assert problem["grupy_docelowe"]["tekst"] == "mama"
    assert problem["miejsca"]["tekst"] == "Wieliczka"
    assert problem["problemy"] == {"tekst": None, "slugi": []}
    assert dict(events)["summary"]["problem"]["miejsca"]["tekst"] == "Wieliczka"


async def test_problem_update_keeps_only_vocabulary_slugs(client, fake_llm):
    args = empty_problem()
    args["grupy_docelowe"] = {
        "tekst": "mama z demencją",
        "slugi": ["osoby-z-demencja", "zmyslony-slug", "osoby-z-demencja", "seniorzy"],
    }
    # Slug z innej sekcji słownika też odpada (dom to miejsce, nie zasób).
    args["zasoby"] = {"tekst": "sąsiedzi", "slugi": ["wolontariusze", "dom"], "poziom_kosztu": None}
    fake_llm([[tool("update_problem", **args), tool("propose_summary", summary="Mama.")]])
    events = await post(client, first_message())

    problem = dict(events)["problem_update"]["problem"]
    assert problem["grupy_docelowe"]["slugi"] == ["osoby-z-demencja", "seniorzy"]
    assert problem["zasoby"]["slugi"] == ["wolontariusze"]


async def test_question_rejected_after_round_limit(client, fake_llm):
    llm = fake_llm(
        [
            [tool("ask_question", text="Jeszcze coś?", options=["a", "b", "c"])],
            [tool("propose_summary", summary="Podsumowanie.")],
        ]
    )
    payload = first_message() | {"state": {"rounds": 4}}
    events = await post(client, payload)

    assert [n for n, _ in events] == ["summary", "done"]
    assert events[-1][1]["state"]["rounds"] == 4
    tool_result = llm.calls[1][-1]
    assert tool_result["type"] == "function_call_output"
    assert tool_result["output"].startswith("BŁĄD:")
    assert "Limit" in tool_result["output"]
    assert "Limit pytań wyczerpany" in llm.calls[0][-1]["content"][1]["text"]


async def test_role_locked_is_not_overwritten(client, fake_llm):
    fake_llm(
        [
            [
                tool("set_role", rola="partner"),
                tool("ask_question", text="?", options=["a", "b", "c"]),
            ]
        ]
    )
    payload = first_message() | {"state": {"rola": "cus-ops", "role_locked": True}}
    events = await post(client, payload)

    assert "role" not in [n for n, _ in events]
    assert events[-1][1]["state"]["rola"] == "cus-ops"


async def test_show_results_now_searches_and_enriches(client, fake_llm):
    llm = fake_llm(
        [
            [tool("search", slugs=[MAIN, OTHER, "nie-istnieje"])],
            [
                tool(
                    "show_results",
                    items=[
                        {"slug": OTHER, "match": "complementary", "why_relevant": "Ćwiczy pamięć."},
                        {"slug": MAIN, "match": "main", "why_relevant": "Przypomina o lekach."},
                    ],
                    no_good_match=False,
                    note=None,
                )
            ],
        ]
    )
    payload = {
        "messages": [
            {"role": "user", "content": "Mama ma demencję"},
            {"role": "assistant", "content": "[Pytanie: Gdzie? | Opcje: a; b]"},
        ],
        "action": "show_results_now",
    }
    events = await post(client, payload)

    # Akcja bez tekstu -> backend dokleja syntetyczną wiadomość użytkownika.
    first_call = llm.calls[0]
    assert first_call[-1]["role"] == "user"
    assert "Pokaż wyniki teraz" in first_call[-1]["content"][0]["text"]

    search_result = json.loads(llm.calls[1][-1]["output"])
    assert {c["slug"] for c in search_result["karty"]} == {MAIN, OTHER}
    assert search_result["nieznane_slugi"] == ["nie-istnieje"]

    results = dict(events)["results"]
    assert [i["slug"] for i in results["items"]] == [MAIN, OTHER]
    assert [i["match"] for i in results["items"]] == ["main", "complementary"]
    assert results["items"][0]["url_zrodlowy"].startswith("https://rops.krakow.pl/")
    assert isinstance(results["items"][0]["wybrana_do_upowszechniania"], bool)
    assert results["no_good_match"] is False


async def test_show_results_requires_search(client, fake_llm):
    llm = fake_llm(
        [
            [
                tool(
                    "show_results",
                    items=[{"slug": MAIN, "match": "main", "why_relevant": "x"}],
                    no_good_match=False,
                    note=None,
                )
            ],
            [tool("search", slugs=[MAIN])],
            [
                tool(
                    "show_results",
                    items=[{"slug": MAIN, "match": "main", "why_relevant": "x"}],
                    no_good_match=False,
                    note=None,
                )
            ],
        ]
    )
    events = await post(client, first_message() | {"action": "show_results_now"})

    assert llm.calls[1][-1]["output"].startswith("BŁĄD:")
    assert [i["slug"] for i in dict(events)["results"]["items"]] == [MAIN]


async def test_question_rejected_when_user_wants_results(client, fake_llm):
    llm = fake_llm(
        [
            [tool("ask_question", text="?", options=["a", "b", "c"])],
            [tool("search", slugs=[MAIN])],
            [
                tool(
                    "show_results",
                    items=[{"slug": MAIN, "match": "main", "why_relevant": "x"}],
                    no_good_match=False,
                    note=None,
                )
            ],
        ]
    )
    events = await post(client, first_message() | {"action": "confirm_summary"})

    assert llm.calls[1][-1]["output"].startswith("BŁĄD:")
    assert "question" not in [n for n, _ in events]
    assert "results" in [n for n, _ in events]


async def test_results_capped_at_five(client, fake_llm):
    slugs = [
        "bawita",
        "kody-qr-na-pomoc-seniorom",
        "terapeuta-przestrzeni",
        "merkury",
        "teleasystent",
        "autyzm-i-ja",
    ]
    items = [{"slug": s, "match": "complementary", "why_relevant": "x"} for s in slugs]
    fake_llm(
        [
            [tool("search", slugs=slugs)],
            [tool("show_results", items=items, no_good_match=False, note=None)],
        ]
    )
    events = await post(client, first_message() | {"action": "show_results_now"})

    result_items = dict(events)["results"]["items"]
    assert len(result_items) == 5
    assert [i["match"] for i in result_items].count("main") == 1


async def test_text_only_answer_gets_one_nudge(client, fake_llm):
    llm = fake_llm([[TextDelta("Hmm.")], [TextDelta("Nadal tekst.")]])
    events = await post(client, first_message())

    assert len(llm.calls) == 2
    assert "Nie wywołano narzędzia" in llm.calls[1][-1]["content"]
    assert events[-1][0] == "done"


async def test_llm_error_becomes_error_event(client, fake_llm):
    fake_llm([LLMError("Błąd API modelu (529)")])
    events = await post(client, first_message())

    # Szczegóły techniczne zostają w logu.
    assert events == [("error", {"message": LLM_UNAVAILABLE})]


async def test_missing_api_key_returns_503(client, monkeypatch):
    monkeypatch.setattr(settings, "llm_api_key", None)
    response = await client.post("/api/v1/chat", json=first_message())
    assert response.status_code == 503
    assert response.json()["detail"] == LLM_UNAVAILABLE


@pytest.mark.parametrize(
    "slug, organizacja",
    [
        ("sciezka-motosensoryczna", "Politechnika Krakowska"),
        ("bez-presji-z-depresji", "Instytut HR"),
    ],
)
async def test_organization_without_names(client, fake_llm, slug, organizacja):
    response = await client.get(f"/api/v1/innovations/{slug}")
    assert response.json()["organizacja"] == organizacja

    fake_llm(
        [
            [tool("search", slugs=[slug])],
            [
                tool(
                    "show_results",
                    items=[{"slug": slug, "match": "main", "why_relevant": "x"}],
                    no_good_match=False,
                )
            ],
        ]
    )
    events = await post(client, first_message() | {"action": "show_results_now"})
    assert dict(events)["results"]["items"][0]["organizacja"] == organizacja


@pytest.mark.parametrize(
    "messages",
    [
        [{"role": "assistant", "content": "hej"}],
        [{"role": "user", "content": "a"}, {"role": "user", "content": "b"}],
        [{"role": "user", "content": "a"}, {"role": "assistant", "content": "b"}],
    ],
)
async def test_invalid_history_is_rejected(client, fake_llm, messages):
    fake_llm([])
    response = await client.post("/api/v1/chat", json={"messages": messages})
    assert response.status_code == 422


@pytest.mark.parametrize(
    "messages",
    [
        [{"role": "user", "content": "x" * 1501}],
        # 7 par po 1500 + 1500 znaków = 22 500 > 20 000
        [{"role": r, "content": "x" * 1500} for r in ["user", "assistant"] * 7 + ["user"]],
        [{"role": r, "content": "x"} for r in ["user", "assistant"] * 15 + ["user"]],
    ],
)
async def test_too_long_history_is_rejected(client, fake_llm, messages):
    llm = fake_llm([])
    response = await client.post("/api/v1/chat", json={"messages": messages})
    assert response.status_code == 422
    assert llm.calls == []


async def test_long_assistant_message_is_allowed(client, fake_llm):
    fake_llm([[tool("ask_question", text="Ile osób?", options=["1", "2", "3"])]])
    messages = [
        {"role": "user", "content": "a"},
        {"role": "assistant", "content": "x" * 4000},
        {"role": "user", "content": "b"},
    ]
    events = await post(client, {"messages": messages})
    assert events[-1][0] == "done"


async def test_exhausted_budget_returns_503_without_model(client, fake_llm):
    llm = fake_llm([])
    budget = TokenBudget(daily_limit=100)
    budget.add(100)
    app.dependency_overrides[get_token_budget] = lambda: budget
    try:
        response = await client.post("/api/v1/chat", json=first_message())
    finally:
        app.dependency_overrides.pop(get_token_budget, None)

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Asystent AI wykorzystał już dzienny limit rozmów. "
        "Wróć jutro albo przejrzyj Bibliotekę Innowacji Społecznych ROPS Kraków."
    )
    assert llm.calls == []


async def test_disabled_chat_returns_503(client, fake_llm, monkeypatch):
    llm = fake_llm([])
    monkeypatch.setattr(settings, "chat_enabled", False)
    response = await client.post("/api/v1/chat", json=first_message())
    assert response.status_code == 503
    assert llm.calls == []


async def test_get_innovation(client):
    response = await client.get(f"/api/v1/innovations/{MAIN}")
    assert response.status_code == 200
    assert response.json()["slug"] == MAIN

    assert (await client.get("/api/v1/innovations/nie-ma")).status_code == 404


async def test_confirmed_summary_goes_to_model(client, fake_llm):
    llm = fake_llm(
        [
            [tool("update_problem", **empty_problem(problemy="samotność"))],
            [tool("search", slugs=[MAIN])],
            [
                tool(
                    "show_results",
                    items=[{"slug": MAIN, "match": "main", "why_relevant": "x"}],
                    no_good_match=False,
                    note=None,
                )
            ],
        ]
    )
    payload = first_message() | {
        "action": "confirm_summary",
        "summary": "Poprawione: 50 seniorów w gminie wiejskiej.",
    }
    events = await post(client, payload)

    context = llm.calls[0][-1]["content"][1]["text"]
    assert "Poprawione: 50 seniorów w gminie wiejskiej." in context
    assert dict(events)["problem_update"]["problem"]["problemy"]["tekst"] == "samotność"


def results_turns(*slugs: str, no_good_match: bool = False) -> list:
    return [
        [tool("search", slugs=list(slugs))],
        [
            tool(
                "show_results",
                items=[{"slug": s, "match": "main", "why_relevant": "x"} for s in slugs],
                no_good_match=no_good_match,
            )
        ],
    ]


async def test_show_results_saves_need(client, fake_llm, sessions):
    fake_llm(results_turns(MAIN, OTHER))
    state = {
        "rola": "mieszkaniec",
        "grupy_docelowe": {"tekst": "mama", "slugi": ["seniorzy", "zmyslony-slug"]},
        "problemy": {"tekst": "samotność", "slugi": ["samotnosc"]},
    }
    events = await post(client, first_message() | {"action": "show_results_now", "state": state})
    assert events[-1][0] == "done"

    async with sessions() as session:
        needs = (await session.scalars(select(Potrzeba))).all()
    assert len(needs) == 1
    need = needs[0]
    assert need.rola == "mieszkaniec"
    assert need.grupy_docelowe == ["seniorzy"]
    assert need.problemy == ["samotnosc"]
    assert need.miejsca == []
    assert need.innowacje == [MAIN, OTHER]
    assert need.brak_dopasowania is False
    assert need.created_at is not None


async def test_need_without_results_is_saved_as_no_match(client, fake_llm, sessions):
    fake_llm([[tool("show_results", items=[], no_good_match=False)]])
    await post(client, first_message() | {"action": "show_results_now"})

    async with sessions() as session:
        need = (await session.scalars(select(Potrzeba))).one()
    assert need.innowacje == []
    assert need.brak_dopasowania is True


async def test_need_save_error_does_not_break_stream(client, fake_llm):
    def broken():
        raise RuntimeError("baza leży")

    app.dependency_overrides[get_session_factory] = lambda: broken
    fake_llm(results_turns(MAIN))
    events = await post(client, first_message() | {"action": "show_results_now"})

    assert [n for n, _ in events] == ["results", "done"]


async def test_question_does_not_save_need(client, fake_llm, sessions):
    fake_llm([[tool("ask_question", text="Gdzie?", options=["a", "b", "c"])]])
    await post(client, first_message())

    async with sessions() as session:
        assert (await session.scalars(select(Potrzeba))).all() == []


def filtered(*chunks: str) -> str:
    notes = NoteFilter()
    return "".join(notes.feed(c) for c in chunks) + notes.flush()


@pytest.mark.parametrize(
    "chunks, expected",
    [
        (["Rozumiem."], "Rozumiem."),
        (["Rozumiem.\n[Pytanie: Gdzie? | Opcje: a; b]"], "Rozumiem.\n"),
        # notatka pocięta na kawałki strumienia
        (["Dobrze.\n[Py", "tanie: Gdzie?", " | Opcje: a]\nDalej."], "Dobrze.\nDalej."),
        (["[Rola: mieszkaniec]\n[Panel: problemy: x]\nJasne."], "Jasne."),
        (["[Wyniki: a, b]"], ""),
        # zwykły nawias zostaje
        (["[uwaga] to nie notatka"], "[uwaga] to nie notatka"),
        (["[P", "rzykład]"], "[Przykład]"),
        (["Linia 1\n", "Linia 2"], "Linia 1\nLinia 2"),
    ],
)
def test_note_filter(chunks, expected):
    assert filtered(*chunks) == expected


async def test_model_notes_are_not_shown(client, fake_llm):
    fake_llm(
        [
            [
                TextDelta("Rozumiem.\n[Pyt"),
                TextDelta("anie: Gdzie? | Opcje: a; b]"),
                tool("ask_question", text="Gdzie mieszka mama?", options=["sama", "ze mną", "DPS"]),
            ]
        ]
    )
    events = await post(client, first_message())

    shown = "".join(e["text"] for n, e in events if n == "text")
    assert shown == "Rozumiem.\n"
    done = events[-1][1]["assistant_message"]
    # w historii zostaje tylko zapis tury z backendu, bez kopii z tekstu modelu
    assert done.count("[Pytanie:") == 1
