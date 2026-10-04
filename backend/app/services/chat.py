import json
import logging
import re
from collections.abc import AsyncIterator
from dataclasses import dataclass, field

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import Potrzeba
from app.repositories.innovation import InnovationRepository
from app.repositories.need import PotrzebaRepository
from app.repositories.obserwator import ObserwatorRepository
from app.schemas.chat import (
    ChatRequest,
    ChatState,
    DoneEvent,
    ErrorEvent,
    GminaStatsEvent,
    ObszarGminy,
    ProblemState,
    ProblemUpdateEvent,
    QuestionEvent,
    ResultItem,
    ResultsEvent,
    RoleEvent,
    SimilarCasesEvent,
    StatusEvent,
    SummaryEvent,
    TextEvent,
)
from app.services import prompts
from app.services.llm import (
    HistoryItem,
    LLMError,
    LLMProvider,
    Message,
    TextDelta,
    ToolCall,
    ToolResult,
    TurnEnd,
)
from app.services.similar_cases import similar_cases

logger = logging.getLogger(__name__)

MAX_LLM_CALLS = 6

LLM_UNAVAILABLE = "Asystent jest chwilowo niedostępny. Spróbuj ponownie za chwilę."

ACTION_MESSAGES = {
    "show_results_now": "[Użytkownik kliknął „Pokaż wyniki teraz”]",
    "confirm_summary": "[Użytkownik potwierdził podsumowanie]",
}

# Statusy etapów tury. Teksty ustala backend, nie model.
STATUS_START = "Analizuję Twoją wiadomość…"
STATUS_START_RESULTS = "Szukam pasujących rozwiązań…"
# Po narzędziu, na czas kolejnego wywołania modelu.
STATUS_AFTER_TOOL = {
    "update_problem": "Uzupełniam opis problemu…",
    "search": "Porównuję rozwiązania z Twoim problemem…",
    "gmina_stats": "Analizuję dane o gminie…",
}

# Początki linii zapisu tury (`_Turn.transcript`, ACTION_MESSAGES). Model widzi je w historii
# i potrafi je naśladować w tekście - takie linie nie trafiają do użytkownika.
NOTE_PREFIXES = (
    "[Rola:",
    "[Panel:",
    "[Pytanie:",
    "[Podsumowanie",
    "[Wyniki:",
    "[Dane gminy:",
    "[Użytkownik",
    "[brak odpowiedzi]",
)
# Model wymyśla też własne notatki w tym stylu (np. „[Miejsca: wieś]” na wzór „[Panel: …]”),
# więc za notatkę uznajemy każdą linię w całości w nawiasie z „Etykieta:” na początku.
NOTE_LINE = re.compile(r"\[[^\[\]\n:]{1,40}:[^\n]*\]")

NUDGE = (
    "Nie wywołano narzędzia kończącego turę. Wywołaj teraz `ask_question`, "
    "`propose_summary` albo `show_results`."
)


class InvalidConversationError(Exception):
    pass


class ChatUnavailableError(Exception):
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
    need: Potrzeba | None = None


def _is_note(line: str) -> bool:
    line = line.strip()
    return line.startswith(NOTE_PREFIXES) or NOTE_LINE.fullmatch(line) is not None


def _may_be_note(start: str) -> bool:
    """Początek linii, który może jeszcze okazać się notatką."""
    start = start.lstrip()
    if any(start.startswith(p) or p.startswith(start) for p in NOTE_PREFIXES):
        return True
    # Nawias jeszcze otwarty albo cała linia wygląda na notatkę; „[uwaga] tekst” przechodzi od razu
    return start.startswith("[") and ("]" not in start or _is_note(start))


class NoteFilter:
    """Usuwa z tekstu modelu linie zapisu tury. Tekst przychodzi kawałkami, więc linię
    zaczynającą się jak notatka wstrzymujemy do końca linii; zwykły tekst idzie od razu.
    """

    def __init__(self) -> None:
        self._held = ""
        self._passing = False

    def feed(self, text: str) -> str:
        out: list[str] = []
        for part in text.splitlines(keepends=True):
            complete = part.endswith("\n")
            if self._passing:
                out.append(part)
                self._passing = not complete
                continue
            self._held += part
            if self._held.strip() and not _may_be_note(self._held):
                out.append(self._held)
                self._held = ""
                self._passing = not complete
            elif complete:
                if not _is_note(self._held):
                    out.append(self._held)
                self._held = ""
        return "".join(out)

    def flush(self) -> str:
        held, self._held, self._passing = self._held, "", False
        return "" if _is_note(held) else held


@dataclass
class _Turn:
    state: ChatState
    searched: set[str] = field(default_factory=set)
    transcript: list[str] = field(default_factory=list)
    text: list[str] = field(default_factory=list)


class ChatService:
    def __init__(
        self,
        llm: LLMProvider | None,
        innovations: InnovationRepository,
        enabled: bool = True,
        sessions: async_sessionmaker[AsyncSession] | None = None,
        obserwator: ObserwatorRepository | None = None,
    ) -> None:
        self.llm = llm
        self.obserwator = obserwator
        self.innovations = innovations
        self.enabled = enabled
        # Fabryka, nie sesja z zależności - zapis jest w trakcie strumienia.
        self.sessions = sessions
        self.system_prompt = prompts.build_system_prompt(innovations)

    def ensure_available(self) -> None:
        """Wyłącznik i klucz modelu - sprawdzane przed strumieniem (503)."""
        if self.llm is None:
            raise ChatUnavailableError(LLM_UNAVAILABLE)
        if not self.enabled:
            raise ChatUnavailableError("Czat jest chwilowo wyłączony. Spróbuj później.")

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
        assert self.llm is not None, "ensure_available() przed run()"
        turn = _Turn(state=request.state.model_copy(deep=True))
        history = self._build_history(request)
        nudged = False
        notes = NoteFilter()
        yield ServerEvent(
            "status", StatusEvent(text=STATUS_START_RESULTS if request.action else STATUS_START)
        )

        try:
            for _ in range(MAX_LLM_CALLS):
                tool_results: list[ToolResult] = []
                terminal = False
                assistant: TurnEnd | None = None

                async for event in self.llm.stream(
                    system=self.system_prompt, tools=prompts.TOOLS, history=history
                ):
                    if isinstance(event, TextDelta):
                        text = notes.feed(event.text)
                    else:
                        # Wstrzymana linia idzie przed zdarzeniami narzędzi i końcem tury.
                        text = notes.flush()
                    if text:
                        turn.text.append(text)
                        yield ServerEvent("text", TextEvent(text=text))

                    if isinstance(event, ToolCall):
                        outcome = self._run_tool(turn, request, event)
                        similar = None
                        if outcome.need is not None:
                            # Przed zapisem, żeby bieżący przypadek nie liczył się do własnych.
                            similar = await self._similar_cases(outcome.need)
                            await self._save_need(outcome.need)
                        for server_event in outcome.events:
                            yield server_event
                        if similar is not None:
                            yield ServerEvent("similar_cases", similar)
                        if not outcome.is_error and (status := STATUS_AFTER_TOOL.get(event.name)):
                            yield ServerEvent("status", StatusEvent(text=status))
                        terminal = terminal or outcome.terminal
                        tool_results.append(ToolResult(event.id, outcome.result, outcome.is_error))
                    elif isinstance(event, TurnEnd):
                        assistant = event

                if terminal or assistant is None:
                    break
                history.append(assistant)
                if tool_results:
                    history.extend(tool_results)
                elif not nudged:
                    nudged = True
                    history.append(Message("user", NUDGE))
                else:
                    break
            else:
                logger.warning("Chat: przekroczono limit %s wywołań modelu", MAX_LLM_CALLS)
        except LLMError as e:
            # Szczegóły tylko w logu - użytkownik dostaje ogólny komunikat.
            logger.error("Chat: błąd modelu: %s", e)
            yield ServerEvent("error", ErrorEvent(message=LLM_UNAVAILABLE))
            return

        yield ServerEvent(
            "done", DoneEvent(assistant_message=self._assistant_message(turn), state=turn.state)
        )

    async def _similar_cases(self, need: Potrzeba) -> SimilarCasesEvent | None:
        """Brak bazy lub błąd odczytu nie przerywa rozmowy: blok po prostu się nie pojawia."""
        if self.sessions is None:
            return None
        try:
            async with self.sessions() as session:
                history = await PotrzebaRepository(session).recent()
            return similar_cases(need, history, self.innovations)
        except Exception:
            logger.exception("Chat: nie udało się policzyć podobnych przypadków")
            return None

    async def _save_need(self, need: Potrzeba) -> None:
        """Błąd zapisu nie przerywa rozmowy - tylko log."""
        if self.sessions is None:
            return
        try:
            async with self.sessions() as session:
                await PotrzebaRepository(session).add(need)
                await session.commit()
        except Exception:
            logger.exception("Chat: nie udało się zapisać potrzeby")

    def _build_history(self, request: ChatRequest) -> list[HistoryItem]:
        history: list[HistoryItem] = [Message(m.role, m.content) for m in request.messages]
        if request.action and request.messages[-1].role == "assistant":
            history.append(Message("user", ACTION_MESSAGES[request.action]))
        last = history[-1]
        assert isinstance(last, Message)
        last.context = prompts.build_turn_context(request.state, request.action, request.summary)
        return history

    def _assistant_message(self, turn: _Turn) -> str:
        """Tekstowy zapis tury, który front odsyła w historii przy kolejnym zapytaniu."""
        parts = ["".join(turn.text).strip(), *turn.transcript]
        return "\n".join(p for p in parts if p) or "[brak odpowiedzi]"

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
        event = RoleEvent(rola=args["rola"])
        turn.state.rola = event.rola
        turn.transcript.append(f"[Rola: {event.rola}]")
        return ToolOutcome("ok", events=[ServerEvent("role", event)])

    def _tool_update_problem(self, turn: _Turn, request: ChatRequest, args: dict) -> ToolOutcome:
        changed: list[str] = []
        for name in ProblemState.model_fields:
            update = args.get(name)
            if not isinstance(update, dict):
                continue  # null = bez zmian
            pole = getattr(turn.state, name)
            tekst = (update.get("tekst") or "").strip()
            if tekst:
                pole.tekst = tekst
                changed.append(f"{name}: {tekst}")
            # Slugi tylko ze słownika - wymyślone przez model odpadają.
            allowed = self.innovations.vocabulary_slugs(prompts.PROBLEM_SECTIONS[name])
            slugi = update.get("slugi") or []
            pole.slugi = [s for s in dict.fromkeys(slugi) if s in allowed][: prompts.MAX_SLUGS]
            if name == "zasoby" and update.get("poziom_kosztu"):
                pole.poziom_kosztu = update["poziom_kosztu"]
        if changed:
            turn.transcript.append("[Panel: " + "; ".join(changed) + "]")
        problem = turn.state.problem()
        return ToolOutcome(
            "ok", events=[ServerEvent("problem_update", ProblemUpdateEvent(problem=problem))]
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
        summary = SummaryEvent(summary=args["summary"].strip(), problem=turn.state.problem())
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
            | ({"nakladka": overlay} if (overlay := self.innovations.overlay(i.slug)) else {})
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
                            "wybrana_do_upowszechniania",
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
        # Stan przychodzi z frontu - do zapisu tylko slugi ze słownika.
        slugs = {
            name: [
                s
                for s in getattr(turn.state, name).slugi
                if s in self.innovations.vocabulary_slugs(section)
            ]
            for name, section in prompts.PROBLEM_SECTIONS.items()
        }
        need = Potrzeba(
            rola=turn.state.rola,
            **slugs,
            innowacje=[i.slug for i in items],
            brak_dopasowania=results.no_good_match,
        )
        return ToolOutcome("ok", terminal=True, events=[ServerEvent("results", results)], need=need)

    def _tool_gmina_stats(self, turn: _Turn, request: ChatRequest, args: dict) -> ToolOutcome:
        gmina = args["gmina"].strip()
        found = self.obserwator.find(gmina) if self.obserwator else []
        if not found:
            return ToolOutcome(
                f"Brak danych dla „{gmina}”. Obserwator obejmuje tylko gminy Małopolski. "
                "Nie podawaj liczb o tej gminie."
            )
        event = GminaStatsEvent(
            gmina=gmina,
            obszary=[ObszarGminy.model_validate(o, from_attributes=True) for o in found],
        )
        turn.transcript.append(f"[Dane gminy: {', '.join(o.nazwa for o in event.obszary)}]")
        return ToolOutcome(
            json.dumps(event.model_dump(), ensure_ascii=False),
            events=[ServerEvent("gmina_stats", event)],
        )
