from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.partnership import EMAIL_PATTERN, Powiat, Sektor


class MentorPublic(BaseModel):
    """Bez e-maila i tokenu: mentora do sprawy przydziela ROPS."""

    id: int
    nazwa: str
    instytucja: str
    sektor: Sektor
    obszary: list[str]
    powiat: str
    opis: str
    syntetyczny: bool


class MentorAdmin(MentorPublic):
    email: str
    aktywny: bool
    created_at: datetime


class MentorInput(BaseModel):
    nazwa: str = Field(min_length=2, max_length=200)
    instytucja: str = Field(min_length=2, max_length=200)
    sektor: Sektor
    obszary: list[str] = Field(max_length=20)
    powiat: Powiat
    opis: str = Field(min_length=10, max_length=1000)
    email: str = Field(max_length=320, pattern=EMAIL_PATTERN)
    aktywny: bool = True


class MentorUpdate(BaseModel):
    nazwa: str | None = Field(default=None, min_length=2, max_length=200)
    instytucja: str | None = Field(default=None, min_length=2, max_length=200)
    sektor: Sektor | None = None
    obszary: list[str] | None = Field(default=None, max_length=20)
    powiat: Powiat | None = None
    opis: str | None = Field(default=None, min_length=10, max_length=1000)
    email: str | None = Field(default=None, max_length=320, pattern=EMAIL_PATTERN)
    aktywny: bool | None = None


class MentorRequested(BaseModel):
    status: Literal["przyjete"] = "przyjete"


class TicketMentorAssign(BaseModel):
    mentor_id: int | None  # None zdejmuje mentora ze zgłoszenia


class TicketMentorRead(BaseModel):
    mentor_prosba: bool
    mentor: MentorAdmin | None


class MentorMessageRead(BaseModel):
    autor_rola: str
    tresc: str
    created_at: datetime


class MentorThreadRead(BaseModel):
    mentor_nazwa: str
    wiadomosci: list[MentorMessageRead]


class MentorReply(BaseModel):
    tresc: str = Field(min_length=2, max_length=4000)
