import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel

from app.repositories.innovation import InnovationRepository
from app.schemas.chat import (
    ChatRequest,
    ChatState,
    DoneEvent,
    ErrorEvent,
    ProblemFields,
    ProblemUpdateEvent,
    QuestionEvent,
    ResultItem,
    ResultsEvent,
    RoleEvent,
    SummaryEvent,
    TextEvent,
)
from app.services import prompts
from app.services.llm import LLMError, LLMService, TextDelta, ToolCall, TurnEnd

logger = logging.getLogger(__name__)

# Ile razy w jednym zapytaniu wołamy model (set_role/update_problem -> search -> show_results...).
MAX_LLM_CALLS = 6

ACTION_MESSAGES = {
    "show_results_now": "[Użytkownik kliknął „Pokaż wyniki teraz”]",
    "confirm_summary": "[Użytkownik potwierdził podsumowanie]",
}

NUDGE = (
    "Nie wywołano narzędzia kończącego turę. Wywołaj teraz `ask_question`, "
    "`propose_summary` albo `show_results`."
)


class InvalidConversationError(Exception):
    pass


@dataclass
class ServerEvent:
    name: str
    data: BaseModel


@dataclass
class ToolOutcome:
    result: str
    is_error: bool = False
    terminal: bool = False
    events: list[ServerEvent] = field(default_factory=list)


@dataclass
class _Turn:
    """Stan jednego zapytania: zmienia się w trakcie pętli narzędzi."""

    state: ChatState
    searched: set[str] = field(default_factory=set)
    transcript: list[str] = field(default_factory=list)
    text: list[str] = field(default_factory=list)


class ChatService:
    def __init__(self, llm: LLMService, innovations: InnovationRepository) -> None:
        self.llm = llm
        self.innovations = innovations
        self.system_prompt = prompts.build_system_prompt(innovations.all())

    def validate(self, request: ChatRequest) -> None:
        """Wywoływane przed otwarciem strumienia, żeby zła historia dała 422."""
        messages = request.messages
        if messages[0].role != "user":
            raise InvalidConversationError("Rozmowa musi zaczynać się od wiadomości użytkownika")
        for prev, cur in zip(messages, messages[1:], strict=False):
            if prev.role == cur.role:
                raise InvalidConversationError("Wiadomości user i assistant muszą być na zmianę")
        if messages[-1].role == "assistant" and request.action is None:
            raise InvalidConversationError("Ostatnia wiadomość musi być od użytkownika")

    async def run(self, request: ChatRequest) -> AsyncIterator[ServerEvent]:
        turn = _Turn(state=request.state.model_copy(deep=True))
        messages = self._build_messages(request)
        nudged = False

        try:
            for _ in range(MAX_LLM_CALLS):
                tool_results: list[dict[str, Any]] = []
                terminal = False
                content: list[Any] = []

                async for event in self.llm.stream(
                    system=self.system_prompt, tools=prompts.TOOLS, messages=messages
                ):
                    if isinstance(event, TextDelta):
                        turn.text.append(event.text)
                        yield ServerEvent("text", TextEvent(text=event.text))
                    elif isinstance(event, ToolCall):
                        outcome = self._run_tool(turn, request, event)
                        for server_event in outcome.events:
                            yield server_event
                        terminal = terminal or outcome.terminal
                        tool_results.append(
                            {
                                "type": "tool_result",
                                "tool_use_id": event.id,
                                "content": outcome.result,
                                "is_error": outcome.is_error,
                            }
                        )
                    elif isinstance(event, TurnEnd):
                        content = event.content

                if terminal:
                    break
                messages.append({"role": "assistant", "content": content})
                if tool_results:
                    messages.append({"role": "user", "content": tool_results})
                elif not nudged:
                    nudged = True
                    messages.append({"role": "user", "content": NUDGE})
                else:
                    break
            else:
                logger.warning("Chat: przekroczono limit %s wywołań modelu", MAX_LLM_CALLS)
        except LLMError as e:
            yield ServerEvent("error", ErrorEvent(message=str(e)))
            return

        yield ServerEvent(
            "done", DoneEvent(assistant_message=self._assistant_message(turn), state=turn.state)
        )

    # --- historia ---

    def _build_messages(self, request: ChatRequest) -> list[dict[str, Any]]:
        messages: list[dict[str, Any]] = [
            {"role": m.role, "content": m.content} for m in request.messages
        ]
        if request.action and messages[-1]["role"] == "assistant":
            messages.append({"role": "user", "content": ACTION_MESSAGES[request.action]})
        last = messages[-1]
        last["content"] = [
            {"type": "text", "text": last["content"]},
            {"type": "text", "text": prompts.build_turn_context(request.state, request.action)},
        ]
        return messages

    def _assistant_message(self, turn: _Turn) -> str:
        """Tekstowy zapis tury, który front odsyła w historii przy kolejnym zapytaniu."""
        parts = ["".join(turn.text).strip(), *turn.transcript]
        return "\n".join(p for p in parts if p) or "[brak odpowiedzi]"

    # --- narzędzia ---

    def _run_tool(self, turn: _Turn, request: ChatRequest, call: ToolCall) -> ToolOutcome:
        handler = getattr(self, f"_tool_{call.name}", None)
        if handler is None:
            return ToolOutcome(f"Nieznane narzędzie: {call.name}", is_error=True)
        try:
            return handler(turn, request, call.input)
        except (KeyError, TypeError, ValueError) as e:
            logger.warning("Chat: złe argumenty %s: %r", call.name, e)
            return ToolOutcome(f"Niepoprawne argumenty: {e}", is_error=True)

    def _tool_set_role(self, turn: _Turn, request: ChatRequest, args: dict) -> ToolOutcome:
        if turn.state.role_locked:
            return ToolOutcome("Rolę ustalił użytkownik - nie zmieniaj jej.", is_error=True)
        role = RoleEvent(role=args["role"]).role
        turn.state.role = role
        turn.transcript.append(f"[Rola: {role}]")
        return ToolOutcome("ok", events=[ServerEvent("role", RoleEvent(role=role))])

    def _tool_update_problem(self, turn: _Turn, request: ChatRequest, args: dict) -> ToolOutcome:
        updates = {k: v.strip() for k, v in args.items() if isinstance(v, str) and v.strip()}
        merged = turn.state.problem.model_dump() | updates
        turn.state.problem = ProblemFields.model_validate(merged)
        if updates:
            turn.transcript.append(
                "[Panel: " + "; ".join(f"{k}: {v}" for k, v in updates.items()) + "]"
            )
        return ToolOutcome(
            "ok",
            events=[ServerEvent("problem_update", ProblemUpdateEvent(problem=turn.state.problem))],
        )

    def _tool_ask_question(self, turn: _Turn, request: ChatRequest, args: dict) -> ToolOutcome:
        if request.action is not None:
            return ToolOutcome(
                "Użytkownik chce wyniki - nie zadawaj pytań. Wywołaj `search` i `show_results`.",
                is_error=True,
            )
        if turn.state.rounds >= prompts.MAX_ROUNDS:
            return ToolOutcome("Limit pytań wyczerpany. Wywołaj `propose_summary`.", is_error=True)
        options = [o.strip() for o in args["options"] if o.strip()]
        if not 2 <= len(options) <= 4:
            return ToolOutcome("Podaj 3-4 odpowiedzi do wyboru.", is_error=True)
        question = QuestionEvent(text=args["text"].strip(), options=options)
        turn.state.rounds += 1
        turn.transcript.append(f"[Pytanie: {question.text} | Opcje: {'; '.join(options)}]")
        return ToolOutcome("ok", terminal=True, events=[ServerEvent("question", question)])

    def _tool_propose_summary(self, turn: _Turn, request: ChatRequest, args: dict) -> ToolOutcome:
        if request.action is not None:
            return ToolOutcome(
                "Użytkownik chce wyniki. Wywołaj `search` i `show_results`.", is_error=True
            )
        summary = SummaryEvent(summary=args["summary"].strip(), problem=turn.state.problem)
        turn.transcript.append(f"[Podsumowanie do potwierdzenia: {summary.summary}]")
        return ToolOutcome("ok", terminal=True, events=[ServerEvent("summary", summary)])

    def _tool_search(self, turn: _Turn, request: ChatRequest, args: dict) -> ToolOutcome:
        slugs = list(dict.fromkeys(args["slugs"]))[: prompts.MAX_SEARCH]
        found = self.innovations.get_many(slugs)
        if not found:
            return ToolOutcome("Żaden slug nie istnieje w katalogu.", is_error=True)
        turn.searched.update(i.slug for i in found)
        cards = [
            i.model_dump(
                include={
                    "slug",
                    "nazwa",
                    "kategorie",
                    "opis",
                    "problem",
                    "grupa_docelowa",
                    "kto_moze_skorzystac",
                    "czy_dziala",
                    "wybrana_do_upowszechniania",
                }
            )
            for i in found
        ]
        missing = sorted(set(slugs) - turn.searched)
        result = {"karty": cards, "nieznane_slugi": missing}
        return ToolOutcome(json.dumps(result, ensure_ascii=False))

    def _tool_show_results(self, turn: _Turn, request: ChatRequest, args: dict) -> ToolOutcome:
        not_searched = [i["slug"] for i in args["items"] if i["slug"] not in turn.searched]
        if not_searched:
            return ToolOutcome(
                f"Najpierw pobierz karty przez `search`: {', '.join(not_searched)}.",
                is_error=True,
            )

        items: list[ResultItem] = []
        seen: set[str] = set()
        for entry in args["items"]:
            innovation = self.innovations.get(entry["slug"])
            if innovation is None or innovation.slug in seen:
                continue
            seen.add(innovation.slug)
            items.append(
                ResultItem(
                    **innovation.model_dump(
                        include={
                            "slug",
                            "nazwa",
                            "kategorie",
                            "url_zrodlowy",
                            "materialy_url",
                            "pdf_url",
                            "youtube_url",
                            "obraz_url",
                            "organizacja",
                            "licencja",
                        }
                    ),
                    match=entry["match"],
                    why_relevant=entry["why_relevant"].strip(),
                )
            )
        # Dokładnie jeden wynik główny, na początku listy.
        items.sort(key=lambda i: i.match != "main")
        items = items[: prompts.MAX_RESULTS]
        for index, item in enumerate(items):
            item.match = "main" if index == 0 else "complementary"

        results = ResultsEvent(
            no_good_match=bool(args["no_good_match"]) or not items,
            note=(args.get("note") or "").strip() or None,
            items=items,
        )
        turn.transcript.append("[Wyniki: " + (", ".join(i.slug for i in items) or "brak") + "]")
        return ToolOutcome("ok", terminal=True, events=[ServerEvent("results", results)])
