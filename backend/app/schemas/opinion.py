from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

RodzajOpinii = Literal["test", "ocena"]
StatusOpinii = Literal["nowa", "opublikowana", "ukryta"]
PoziomDowodu = Literal["opisane", "pilotaz", "sprawdzone"]


class OpiniaCreate(BaseModel):
    rodzaj: RodzajOpinii
    ocena: int | None = Field(default=None, ge=1, le=5)
    instytucja: str | None = Field(default=None, max_length=200)
    tresc: str = Field(min_length=10, max_length=2000)
    usprawnienie: str | None = Field(default=None, max_length=2000)
    autor_email: str | None = Field(
        default=None, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )

    @model_validator(mode="after")
    def ocena_wymagana(self) -> "OpiniaCreate":
        if self.rodzaj == "ocena" and self.ocena is None:
            raise ValueError("Ocena wymaga liczby gwiazdek od 1 do 5")
        return self


class OpiniaCreated(BaseModel):
    status: StatusOpinii
    # Tylko przy zgłoszeniu do testów: wątek z odpowiedzią ROPS.
    token_watku: str | None


class OpiniaPublic(BaseModel):
    rodzaj: RodzajOpinii
    ocena: int | None
    instytucja: str | None
    tresc: str
    usprawnienie: str | None
    syntetyczna: bool
    created_at: datetime


class Poziom(BaseModel):
    kod: PoziomDowodu
    etykieta: str
    opis: str


class OpinieSummary(BaseModel):
    """Podsumowanie testów i ocen innowacji: tylko opinie zatwierdzone przez ROPS."""

    slug: str
    liczba_ocen: int
    srednia: float | None
    liczba_testow: int
    poziom: Poziom
    opinie: list[OpiniaPublic]
    # Czy jest instytucja testująca, do której ROPS może przekazać pytanie (zadanie 0044).
    mozna_zapytac: bool = False


class OpiniaAdmin(OpiniaPublic):
    id: int
    slug: str
    nazwa: str | None
    status: StatusOpinii
    token_watku: str | None


class OpinieAdminList(BaseModel):
    items: list[OpiniaAdmin]
    total: int


class OpiniaStatusUpdate(BaseModel):
    status: StatusOpinii


class TesterQuestion(BaseModel):
    """Pytanie do instytucji, które testują innowację; ROPS przekazuje je dalej (zadanie 0044)."""

    tresc: str = Field(min_length=10, max_length=2000)
    instytucja: str | None = Field(default=None, max_length=200)
    autor_email: str | None = Field(
        default=None, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )


class TesterQuestionCreated(BaseModel):
    token_watku: str
