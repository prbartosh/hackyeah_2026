from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

StatusImportu = Literal["szkic", "zatwierdzony", "odrzucony"]


class ImportField(BaseModel):
    wartosc: Any | None
    cytat: str | None
    pewnosc: float | None
    # Wartość z AI o niskiej pewności: UI oznacza ją tekstem, nie tylko kolorem.
    niska_pewnosc: bool
    reczne: bool = False


class ImportListItem(BaseModel):
    id: int
    nazwa_pliku: str
    status: StatusImportu
    ekstrakcja_zrodlo: str
    karta_slug: str | None
    created_at: datetime


class ImportList(BaseModel):
    items: list[ImportListItem]
    total: int


class ImportRead(ImportListItem):
    komunikat: str | None
    tekst: str
    pola: dict[str, ImportField]
    etykiety: dict[str, str]


class ImportUpdate(BaseModel):
    pola: dict[str, Any] = Field(max_length=20)


class ImportApprove(BaseModel):
    aktualizuj_slug: str | None = Field(default=None, max_length=200)
