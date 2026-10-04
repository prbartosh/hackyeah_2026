from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.partnership import EMAIL_PATTERN

StatusPytania = Literal["nowe", "odpowiedziane", "opublikowane", "ukryte"]


class PytanieCreate(BaseModel):
    tresc: str = Field(min_length=10, max_length=2000)
    kategoria: str | None = Field(default=None, max_length=100, pattern=r"^[a-z0-9-]+$")
    autor_nazwa: str | None = Field(default=None, max_length=200)
    autor_email: str | None = Field(default=None, max_length=320, pattern=EMAIL_PATTERN)
    zgoda_na_publikacje: bool = False


class PytanieCreated(BaseModel):
    id: int
    status: StatusPytania


class PytaniePublic(BaseModel):
    """Bez e-maila i nazwy autora: pytanie publikujemy anonimowo."""

    id: int
    tresc: str
    kategoria: str | None
    odpowiedz: str
    odpowiedziano: datetime
    syntetyczne: bool


class PytanieAdmin(BaseModel):
    id: int
    tresc: str
    kategoria: str | None
    autor_nazwa: str | None
    autor_email: str | None
    zgoda_na_publikacje: bool
    odpowiedz: str | None
    odpowiedziano: datetime | None
    status: StatusPytania
    syntetyczne: bool
    created_at: datetime


class PytanieAdminList(BaseModel):
    items: list[PytanieAdmin]
    total: int


class OdpowiedzUpdate(BaseModel):
    odpowiedz: str = Field(min_length=5, max_length=6000)
