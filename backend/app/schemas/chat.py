from typing import Literal

from pydantic import BaseModel, Field, model_validator

# Role i stan problemu (panel „Twój problem”).
Role = Literal["mieszkaniec", "cus-ops", "partner"]
PoziomKosztu = Literal["niski", "sredni", "wysoki"]
ChatAction = Literal["show_results_now", "confirm_summary"]
MatchKind = Literal["main", "complementary"]

# Limity kosztu czatu (zadanie 0006). Wiadomość asystenta zawiera zapis tury, więc jest dłuższa.
MAX_MESSAGES = 30
MAX_USER_MESSAGE_CHARS = 1500
MAX_MESSAGE_CHARS = 4000
MAX_HISTORY_CHARS = 20_000


class PoleProblemu(BaseModel):
    tekst: str | None = None
    slugi: list[str] = Field(default_factory=list)


class PoleZasoby(PoleProblemu):
    poziom_kosztu: PoziomKosztu | None = None


class ProblemState(BaseModel):
    """Panel „Twój problem”."""

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

    @model_validator(mode="after")
    def _user_limit(self) -> "ChatMessage":
        if self.role == "user" and len(self.content) > MAX_USER_MESSAGE_CHARS:
            raise ValueError(
                f"Wiadomość użytkownika może mieć najwyżej {MAX_USER_MESSAGE_CHARS} znaków"
            )
        return self


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=MAX_MESSAGES)
    state: ChatState = Field(default_factory=ChatState)
    action: ChatAction | None = None
    # Podsumowanie poprawione przez użytkownika, wysyłane z action = "confirm_summary".
    summary: str | None = Field(default=None, max_length=MAX_MESSAGE_CHARS)

    @model_validator(mode="after")
    def _history_limit(self) -> "ChatRequest":
        if sum(len(m.content) for m in self.messages) > MAX_HISTORY_CHARS:
            raise ValueError(f"Historia rozmowy może mieć najwyżej {MAX_HISTORY_CHARS} znaków")
        return self


class TextEvent(BaseModel):
    text: str


class StatusEvent(BaseModel):
    """Krótki opis etapu tury dla użytkownika (np. „Przeglądam Bibliotekę Innowacji…”)."""

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


class PodobnaInnowacjaPrzypadkow(BaseModel):
    slug: str
    nazwa: str
    liczba: int


class SimilarCasesEvent(BaseModel):
    """Zagregowane podobne przypadki (zadanie 0025): tylko liczby, bez treści rozmów."""

    liczba: int
    problem: str
    innowacje: list[PodobnaInnowacjaPrzypadkow]


class WskaznikGminy(BaseModel):
    id: str
    nazwa: str
    wartosc: str
    rok: str
    zrodlo: str
    url: str


class ObszarGminy(BaseModel):
    nazwa: str
    powiat: str
    wskazniki: list[WskaznikGminy]


class GminaStatsEvent(BaseModel):
    """Dane gminy z Obserwatora Statystyk Społecznych (zadanie 0013) dla panelu pod „Gdzie”."""

    gmina: str
    obszary: list[ObszarGminy]


class DoneEvent(BaseModel):
    # Front dopisuje to dosłownie do historii jako wiadomość asystenta.
    assistant_message: str
    state: ChatState


class ErrorEvent(BaseModel):
    message: str
