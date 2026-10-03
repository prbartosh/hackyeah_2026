from datetime import datetime

from pydantic import BaseModel, Field


class WeekCount(BaseModel):
    tydzien: str  # poniedziałek tygodnia, RRRR-MM-DD
    liczba: int


class ClusterExample(BaseModel):
    id: int
    skrot: str


class ClusterRead(BaseModel):
    klucz: str
    nazwa: str
    nazwa_zrodlo: str  # "ai" | "slowa"
    liczba: int
    kategoria: str | None
    trend: list[WeekCount]
    zmiana: str  # "rosnący" | "malejący" | "stały" | "za mało danych"
    przyklady: list[ClusterExample]
    zgloszenia_ids: list[int]
    notatka_id: int | None


class RadarRead(BaseModel):
    klastry: list[ClusterRead]
    bez_dopasowania: int
    nieprzeanalizowane: int
    prog_dopasowania: float
    prog_klastra: float
    komunikat: str | None


class NoteCreate(BaseModel):
    tytul: str = Field(min_length=1, max_length=300)
    zgloszenia_ids: list[int] = Field(min_length=1, max_length=200)


class NoteRead(BaseModel):
    id: int
    tytul: str
    tresc: str
    zgloszenia_ids: list[int]
    wykonana: bool
    created_at: datetime


class NoteUpdate(BaseModel):
    wykonana: bool
