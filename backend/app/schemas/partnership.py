from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

TypOgloszenia = Literal["szukam_partnera", "oferuje_wsparcie"]
Sektor = Literal["publiczny", "ngo", "biznes", "nauka", "mieszkancy"]
StatusOgloszenia = Literal["oczekuje", "opublikowane", "odrzucone"]

# 19 powiatów ziemskich i 3 miasta na prawach powiatu.
Powiat = Literal[
    "bocheński", "brzeski", "chrzanowski", "dąbrowski", "gorlicki", "krakowski", "limanowski",
    "miechowski", "myślenicki", "nowosądecki", "nowotarski", "olkuski", "oświęcimski",
    "proszowicki", "suski", "tarnowski", "tatrzański", "wadowicki", "wielicki",
    "m. Kraków", "m. Nowy Sącz", "m. Tarnów",
]  # fmt: skip

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class OfferCreate(BaseModel):
    typ: TypOgloszenia
    sektor: Sektor
    instytucja: str = Field(min_length=2, max_length=200)
    tytul: str = Field(min_length=5, max_length=200)
    opis: str = Field(min_length=20, max_length=2000)
    powiat: Powiat
    innowacja_slug: str | None = Field(default=None, max_length=200, pattern=r"^[a-z0-9-]+$")
    kontakt_email: str = Field(max_length=320, pattern=EMAIL_PATTERN)


class OfferCreated(BaseModel):
    id: int
    status: StatusOgloszenia


class OfferPublic(BaseModel):
    """Bez e-maila: kontakt tylko przez ROPS."""

    id: int
    typ: TypOgloszenia
    sektor: Sektor
    instytucja: str
    tytul: str
    opis: str
    powiat: str
    innowacja_slug: str | None
    syntetyczne: bool
    created_at: datetime


class OfferAdmin(OfferPublic):
    status: StatusOgloszenia
    kontakt_email: str


class OfferAdminList(BaseModel):
    items: list[OfferAdmin]
    total: int


class OfferStatusUpdate(BaseModel):
    status: Literal["opublikowane", "odrzucone"]


class ContactCreate(BaseModel):
    nadawca_nazwa: str = Field(min_length=2, max_length=200)
    nadawca_email: str = Field(max_length=320, pattern=EMAIL_PATTERN)
    tresc: str = Field(min_length=10, max_length=2000)
