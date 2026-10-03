from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class DocumentImport(TimestampMixin, Base):
    """Dokument projektu wgrany przez admina i szkic karty z niego wyciągnięty."""

    __tablename__ = "importy_dokumentow"

    id: Mapped[int] = mapped_column(primary_key=True)
    nazwa_pliku: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(20), default="szkic", index=True)
    tekst: Mapped[str] = mapped_column(Text)
    # {pole: {"wartosc": ..., "cytat": str | None, "pewnosc": float | None}}
    pola: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    ekstrakcja_zrodlo: Mapped[str] = mapped_column(String(10), default="reczna")  # "ai" | "reczna"
    komunikat: Mapped[str | None] = mapped_column(Text)
    karta_slug: Mapped[str | None] = mapped_column(String(200))


class TrendNote(Base):
    """Notatka/zadanie dla ROPS utworzona z klastra radaru."""

    __tablename__ = "notatki_rops"

    id: Mapped[int] = mapped_column(primary_key=True)
    tytul: Mapped[str] = mapped_column(String(300))
    tresc: Mapped[str] = mapped_column(Text)
    zgloszenia_ids: Mapped[list[int]] = mapped_column(JSON, default=list)
    wykonana: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ClusterName(Base):
    """Cache nazw klastrów radaru (klucz: skrót posortowanych id zgłoszeń)."""

    __tablename__ = "nazwy_klastrow"

    klucz: Mapped[str] = mapped_column(String(64), primary_key=True)
    nazwa: Mapped[str] = mapped_column(String(200))
