from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

StatusKarty = Literal["szkic", "opublikowana", "zarchiwizowana"]
PoziomDowodu = Literal["brak_danych", "zadeklarowany", "pilotaz", "przetestowany", "wdrozony"]
PoziomKosztu = Literal["niski", "sredni", "wysoki"]
CzasStartu = Literal["dni", "tygodnie", "miesiace"]


class Wdrozenie(BaseModel):
    """Koszt i czas wdrożenia dla instytucji (ADR 0004 §3). Puste = brak danych."""

    poziom_kosztu: PoziomKosztu | None = None
    czas_startu: CzasStartu | None = None
    wymagane_zasoby: list[str] = Field(default_factory=list, max_length=20)
    uwagi: str | None = Field(default=None, max_length=2000)


class CardListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    nazwa: str
    status: StatusKarty
    zrodlo: str
    kategorie: list[str]
    poziom_dowodu: str | None
    updated_at: datetime


class CardList(BaseModel):
    items: list[CardListItem]
    total: int


class CardRead(CardListItem):
    wybrana_do_upowszechniania: bool
    opis: str | None
    problem: str | None
    grupa_docelowa: str | None
    kto_moze_skorzystac: str | None
    czy_dziala: str | None
    organizacja: str | None
    licencja: str | None
    url_zrodlowy: str | None
    wdrozenie: Wdrozenie | None
    ma_embedding: bool
    # Komunikat o trybie uproszczonym embeddingów, jeśli dotyczy.
    ostrzezenie: str | None = None


class CardUpdate(BaseModel):
    nazwa: str | None = Field(default=None, min_length=1, max_length=500)
    status: StatusKarty | None = None
    kategorie: list[str] | None = Field(default=None, max_length=10)
    wybrana_do_upowszechniania: bool | None = None
    opis: str | None = Field(default=None, max_length=20000)
    problem: str | None = Field(default=None, max_length=5000)
    grupa_docelowa: str | None = Field(default=None, max_length=2000)
    kto_moze_skorzystac: str | None = Field(default=None, max_length=2000)
    czy_dziala: str | None = Field(default=None, max_length=5000)
    poziom_dowodu: PoziomDowodu | None = None
    organizacja: str | None = Field(default=None, max_length=1000)
    licencja: str | None = Field(default=None, max_length=1000)
    wdrozenie: Wdrozenie | None = None


class CardCreate(CardUpdate):
    nazwa: str = Field(min_length=1, max_length=500)
