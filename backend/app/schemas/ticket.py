from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Status = Literal["nowe", "w_trakcie", "odpowiedziane"]
Pilnosc = Literal["niska", "srednia", "wysoka"]
Sortowanie = Literal["pilnosc", "czas", "najnowsze"]


class TicketCreate(BaseModel):
    tresc: str = Field(min_length=10, max_length=4000)
    autor_nazwa: str | None = Field(default=None, max_length=200)
    autor_email: str | None = Field(
        default=None, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )


class TicketCreated(BaseModel):
    token_watku: str


class ThreadMessageRead(BaseModel):
    autor_rola: Literal["uzytkownik", "admin"]
    tresc: str
    zrodla: list[dict] | None
    created_at: datetime
    podpis: str | None = None


class ThreadRead(BaseModel):
    status: Status
    wiadomosci: list[ThreadMessageRead]
    prosba_o_eksperta: bool = False
    ekspert: str | None = None


class ExpertAssign(BaseModel):
    """Ekspert z listy `EKSPERCI`; None zdejmuje przypisanie."""

    ekspert: str | None = Field(default=None, max_length=150)


class ThreadReply(BaseModel):
    """Odpowiedź autora w jego wątku (bez konta, przez token)."""

    tresc: str = Field(min_length=2, max_length=4000)


class TesterContact(BaseModel):
    """Instytucja testująca innowację; kontakt tylko przez wątek ROPS, bez e-maila."""

    opinia_id: int
    instytucja: str | None
    tresc: str


class ForwardQuestion(BaseModel):
    opinia_id: int
    tresc: str = Field(min_length=10, max_length=8000)


class CardSuggestion(BaseModel):
    slug: str
    nazwa: str
    score: float
    powody: list[str] = []
    url: str
    uzyta: bool = False


class DuplicateRead(BaseModel):
    id: int
    score: float
    tresc: str
    status: Status


class SlaInfo(BaseModel):
    oczekuje_godzin: float
    cel_godzin: float
    przeterminowane: bool
    pozostalo_godzin: float | None


class TicketListItem(BaseModel):
    id: int
    skrot: str
    status: Status
    kategoria: str | None
    pilnosc: Pilnosc | None
    created_at: datetime
    syntetyczne: bool
    triaz_wykonany: bool
    liczba_duplikatow: int
    sla: SlaInfo
    prosba_o_eksperta: bool = False
    ekspert: str | None = None


class TicketList(BaseModel):
    items: list[TicketListItem]
    total: int


class TicketRead(TicketListItem):
    tresc: str
    autor_nazwa: str | None
    autor_email: str | None
    pilnosc_uzasadnienie: str | None
    duplikaty: list[DuplicateRead]
    proponowane_karty: list[CardSuggestion]
    szkic_odpowiedzi: str | None
    triaz_zrodlo: str | None
    triaz_komunikat: str | None
    najlepsze_dopasowanie: float | None
    wiadomosci: list[ThreadMessageRead]
    innowacja_slug: str | None = None
    testujacy: list[TesterContact] = []


class DraftUpdate(BaseModel):
    szkic_odpowiedzi: str = Field(max_length=8000)


class ReplyApprove(BaseModel):
    """Treść zatwierdzona przez człowieka; slugi to karty cytowane w odpowiedzi."""

    tresc: str = Field(min_length=1, max_length=8000)
    zrodla: list[str] = Field(default_factory=list, max_length=10)


class TicketStatusUpdate(BaseModel):
    status: Status


class NotificationRead(BaseModel):
    id: int
    tekst: str
    zgloszenie_id: int | None
    przeczytane: bool
    created_at: datetime


class NotificationList(BaseModel):
    items: list[NotificationRead]
    nieprzeczytane: int


class MarkRead(BaseModel):
    ids: list[int] | None = None  # None = wszystkie


class SettingsRead(BaseModel):
    prog_duplikatow: float
    prog_dopasowania: float
    prog_klastra: float
    sla_godziny: float
    ai_dostepne: bool


class SettingsUpdate(BaseModel):
    prog_duplikatow: float | None = Field(default=None, gt=0, le=1)
    prog_dopasowania: float | None = Field(default=None, gt=0, le=1)
    prog_klastra: float | None = Field(default=None, gt=0, le=1)
    sla_godziny: float | None = Field(default=None, gt=0, le=24 * 60)
