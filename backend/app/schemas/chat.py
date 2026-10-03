from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["mieszkaniec", "ngo", "jst", "cus_ops", "ekspert"]
ChatAction = Literal["show_results_now", "confirm_summary"]
MatchKind = Literal["main", "complementary"]

MAX_MESSAGES = 40
MAX_MESSAGE_CHARS = 4000


class ProblemFields(BaseModel):
    """Panel „Twój problem”. None = jeszcze nieustalone."""

    kogo_dotyczy: str | None = None
    gdzie: str | None = None
    skala: str | None = None
    przyczyna: str | None = None
    co_probowano: str | None = None
    zasoby: str | None = None


class ChatState(BaseModel):
    role: Role | None = None
    # True, gdy użytkownik sam zmienił rolę przyciskiem „Zmień” - model jej nie nadpisuje.
    role_locked: bool = False
    problem: ProblemFields = Field(default_factory=ProblemFields)
    rounds: int = Field(default=0, ge=0)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=MAX_MESSAGES)
    state: ChatState = Field(default_factory=ChatState)
    action: ChatAction | None = None


# --- Dane zdarzeń SSE ---


class TextEvent(BaseModel):
    text: str


class RoleEvent(BaseModel):
    role: Role


class ProblemUpdateEvent(BaseModel):
    problem: ProblemFields


class QuestionEvent(BaseModel):
    text: str
    options: list[str]


class SummaryEvent(BaseModel):
    summary: str
    problem: ProblemFields


class ResultItem(BaseModel):
    slug: str
    nazwa: str
    match: MatchKind
    why_relevant: str
    kategorie: list[str]
    url_zrodlowy: str
    materialy_url: str
    pdf_url: str | None
    youtube_url: str | None
    obraz_url: str
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
