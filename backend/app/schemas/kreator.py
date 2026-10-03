from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

Etap = Literal["pomysl", "test_mikroskala", "wdrozone_lokalnie"]
PoleFiszki = Literal["istota", "odbiorca", "etap", "obszar", "lokalizacja", "potrzeby"]
StatusNaboru = Literal["aktywny", "zaplanowany", "zakonczony"]

ETAP_ETYKIETY: dict[str, str] = {
    "pomysl": "Pomysł (jeszcze niesprawdzony)",
    "test_mikroskala": "Test w mikroskali",
    "wdrozone_lokalnie": "Wdrożone lokalnie",
}
POLA_FISZKI_ETYKIETY: dict[str, str] = {
    "istota": "Istota pomysłu",
    "odbiorca": "Dla kogo jest",
    "etap": "Etap realizacji",
    "obszar": "Obszar społeczny",
    "lokalizacja": "Lokalizacja",
    "potrzeby": "Czego potrzeba do dalszego rozwoju",
}


class FiszkaFields(BaseModel):
    opis_wlasny: str | None = Field(default=None, max_length=4000)
    istota: str | None = Field(default=None, max_length=2000)
    odbiorca: str | None = Field(default=None, max_length=1000)
    etap: Etap | None = None
    obszar: str | None = Field(default=None, max_length=100)
    lokalizacja: str | None = Field(default=None, max_length=200)
    potrzeby: str | None = Field(default=None, max_length=2000)
    pola_ai: list[PoleFiszki] | None = None


class KartaZrodlo(BaseModel):
    slug: str
    nazwa: str
    url: str


class FiszkaRead(BaseModel):
    token: str
    status: Literal["szkic", "wyslana"]
    opis_wlasny: str | None
    istota: str | None
    odbiorca: str | None
    etap: Etap | None
    obszar: str | None
    lokalizacja: str | None
    potrzeby: str | None
    pola_ai: list[str]
    karta: KartaZrodlo | None
    token_watku: str | None
    syntetyczna: bool
    updated_at: datetime


class FiszkaSend(BaseModel):
    autor_nazwa: str | None = Field(default=None, max_length=200)
    autor_email: str | None = Field(
        default=None, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )


class FiszkaSent(BaseModel):
    token_watku: str


class AiFillRequest(BaseModel):
    opis: str = Field(min_length=10, max_length=4000)


class AiFillResponse(BaseModel):
    pola: dict[str, str | None]
    ai_uzyte: bool
    komunikat: str | None = None


class PodobnaInnowacja(BaseModel):
    slug: str
    nazwa: str
    url: str
    zrodlo: str
    problem: str | None
    grupa_docelowa: str | None
    score: float
    powody: list[str] = []


class PodobneRead(BaseModel):
    items: list[PodobnaInnowacja]


class NaborPole(BaseModel):
    klucz: str = Field(min_length=1, max_length=60, pattern=r"^[a-z0-9_]+$")
    etykieta: str = Field(min_length=1, max_length=200)
    limit: int = Field(ge=50, le=10000)
    wskazowka: str = Field(default="", max_length=500)
    zrodla: list[PoleFiszki] = Field(default_factory=list)


class Kryterium(BaseModel):
    nazwa: str = Field(min_length=1, max_length=200)
    opis: str = Field(default="", max_length=500)


class NaborInput(BaseModel):
    nazwa: str = Field(min_length=3, max_length=300)
    organizator: str | None = Field(default=None, max_length=300)
    opis: str | None = Field(default=None, max_length=3000)
    url_zrodlowy: str | None = Field(default=None, max_length=500)
    termin_od: date
    termin_do: date
    pola: list[NaborPole] = Field(min_length=1, max_length=30)
    kryteria: list[Kryterium] = Field(default_factory=list, max_length=20)
    obszary: list[str] = Field(default_factory=list, max_length=20)
    odbiorcy: list[str] = Field(default_factory=list, max_length=30)


class NaborRead(NaborInput):
    slug: str
    status: StatusNaboru
    syntetyczny: bool


class Dopasowanie(BaseModel):
    pasuje: bool
    powod: str


class NaborDopasowany(BaseModel):
    nabor: NaborRead
    dopasowanie: Dopasowanie


class NaboryRead(BaseModel):
    aktywne: list[NaborDopasowany]
    kolejny: NaborRead | None
    ostatni_zakonczony: NaborRead | None


class WniosekCreate(BaseModel):
    fiszka_token: str = Field(min_length=10, max_length=64)
    nabor_slug: str = Field(min_length=1, max_length=100)


class WniosekPoleRead(BaseModel):
    klucz: str
    etykieta: str
    limit: int
    wskazowka: str
    tekst: str
    zrodlo: Literal["ai", "fiszka", "brak", "uzytkownik"]
    uzyte_pola: list[str]
    do_uzupelnienia: bool


class WniosekRead(BaseModel):
    token: str
    fiszka_token: str
    nabor: NaborRead
    nabor_aktywny: bool
    pola: list[WniosekPoleRead]
    kryteria: list[Kryterium]
    status: Literal["szkic", "wyslany"]
    token_watku: str | None
    komunikat_ai: str | None
    updated_at: datetime


class WniosekUpdate(BaseModel):
    pola: dict[str, str] = Field(max_length=30)


class SzablonSekcja(BaseModel):
    klucz: str
    grupa: str
    tytul: str
    podpowiedz: str
    pytania: list[str]


class SzablonCanvy(BaseModel):
    slug: str
    nazwa: str
    opis: str | None
    url_zrodlowy: str | None
    sekcje: list[SzablonSekcja]


class CanvaCreate(BaseModel):
    szablon: str = Field(default="innowacji-spolecznych", max_length=100)
    tytul: str = Field(default="", max_length=300)
    fiszka_token: str | None = Field(default=None, max_length=64)


class CanvaUpdate(BaseModel):
    tytul: str | None = Field(default=None, max_length=300)
    wartosci: dict[str, str] | None = None


class CanvaRead(BaseModel):
    token: str
    tytul: str
    szablon: SzablonCanvy
    wartosci: dict[str, str]
    fiszka_token: str | None
    syntetyczna: bool
    updated_at: datetime


class AsystentRead(BaseModel):
    braki: list[str]
    pytania: list[str]
    kolejne_kroki: list[str]
    ai_uzyte: bool
    komunikat: str | None = None
