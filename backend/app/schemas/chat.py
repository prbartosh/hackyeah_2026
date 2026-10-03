from typing import Literal

from pydantic import BaseModel, Field

# Role i stan problemu zgodne z ADR 0004 (§3, §7).
Role = Literal["mieszkaniec", "cus-ops", "partner"]
PoziomKosztu = Literal["niski", "sredni", "wysoki"]
ChatAction = Literal["show_results_now", "confirm_summary"]
MatchKind = Literal["main", "complementary"]

MAX_MESSAGES = 40
MAX_MESSAGE_CHARS = 4000


class PoleProblemu(BaseModel):
    """Pole panelu: tekst do wyświetlenia i slugi ze słownika do wyszukiwania."""

    tekst: str | None = None
    slugi: list[str] = Field(default_factory=list)


class PoleZasoby(PoleProblemu):
    poziom_kosztu: PoziomKosztu | None = None


class ProblemState(BaseModel):
    """Panel „Twój problem” (ADR 0004 §7)."""

    grupy_docelowe: PoleProblemu = Field(default_factory=PoleProblemu)
    problemy: PoleProblemu = Field(default_factory=PoleProblemu)
    miejsca: PoleProblemu = Field(default_factory=PoleProblemu)
    skale: PoleProblemu = Field(default_factory=PoleProblemu)
    zasoby: PoleZasoby = Field(default_factory=PoleZasoby)
    proby: PoleProblemu = Field(default_factory=PoleProblemu)


class ChatState(ProblemState):
    rola: Role | None = None
    # True, gdy użytkownik sam zmienił rolę przyciskiem „Zmień” - model jej nie nadpisuje.
    role_locked: bool = False
    rounds: int = Field(default=0, ge=0)

    def problem(self) -> ProblemState:
        return ProblemState.model_validate(self.model_dump(include=set(ProblemState.model_fields)))


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=MAX_MESSAGES)
    state: ChatState = Field(default_factory=ChatState)
    action: ChatAction | None = None
    # Podsumowanie poprawione przez użytkownika, wysyłane z action = "confirm_summary".
    summary: str | None = Field(default=None, max_length=MAX_MESSAGE_CHARS)


# --- Dane zdarzeń SSE ---


class TextEvent(BaseModel):
    text: str


class RoleEvent(BaseModel):
    rola: Role


class ProblemUpdateEvent(BaseModel):
    problem: ProblemState


class QuestionEvent(BaseModel):
    text: str
    options: list[str]


class SummaryEvent(BaseModel):
    summary: str
    problem: ProblemState


class ResultItem(BaseModel):
    slug: str
    nazwa: str
    match: MatchKind
    why_relevant: str
    kategorie: list[str]
    wybrana_do_upowszechniania: bool
    url_zrodlowy: str
    materialy_url: str | None
    pdf_url: str | None
    youtube_url: str | None
    obraz_url: str | None
    organizacja: str | None
    licencja: str | None


class ResultsEvent(BaseModel):
    no_good_match: bool
    note: str | None
    items: list[ResultItem]


class DoneEvent(BaseModel):
    # Front dopisuje to dosłownie do historii jako wiadomość asystenta.
    assistant_message: str
    state: ChatState


class ErrorEvent(BaseModel):
    message: str
