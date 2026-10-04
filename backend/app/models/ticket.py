from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin

STATUSY_ZGLOSZENIA = ("nowe", "w_trakcie", "odpowiedziane")


class Ticket(TimestampMixin, Base):
    """Zgłoszenie (potrzeba) od użytkownika, bez konta; autor wraca przez token wątku."""

    __tablename__ = "zgloszenia"

    id: Mapped[int] = mapped_column(primary_key=True)
    tresc: Mapped[str] = mapped_column(Text)
    autor_nazwa: Mapped[str | None] = mapped_column(String(200))
    autor_email: Mapped[str | None] = mapped_column(String(320))
    # Dane demo są oznaczone jako syntetyczne (zero prawdziwych danych osobowych).
    syntetyczne: Mapped[bool] = mapped_column(Boolean, default=False)
    token_watku: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="nowe", index=True)
    odpowiedziano: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    kategoria: Mapped[str | None] = mapped_column(String(100), index=True)
    pilnosc: Mapped[str | None] = mapped_column(String(10))
    pilnosc_uzasadnienie: Mapped[str | None] = mapped_column(Text)
    duplikaty: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    proponowane_karty: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    szkic_odpowiedzi: Mapped[str | None] = mapped_column(Text)
    triaz_zrodlo: Mapped[str | None] = mapped_column(String(10))  # "ai" | "reguly"
    triaz_komunikat: Mapped[str | None] = mapped_column(Text)
    najlepsze_dopasowanie: Mapped[float | None] = mapped_column(Float)
    # Tagi ze słownika (sekcja -> slugi): z fraz w treści, po triażu AI zwalidowane tagi modelu.
    tagi: Mapped[dict[str, list[str]] | None] = mapped_column(JSON)
    # Mentor przydzielony przez ROPS i prośba autora o mentora (ADR 0014).
    mentor_id: Mapped[int | None] = mapped_column(ForeignKey("mentorzy.id", ondelete="SET NULL"))
    mentor_prosba: Mapped[bool] = mapped_column(Boolean, default=False)
    # Nieużywane od ADR 0006 (embeddingi zastąpiło matching.py); kolumny zostają do czasu migracji.
    embedding: Mapped[list[float] | None] = mapped_column(JSON)
    embedding_model: Mapped[str | None] = mapped_column(String(80))


class ThreadMessage(Base):
    """Wiadomość wątku, kluczowana tokenem (niezależna od zgłoszeń, do reuse w komunikacji)."""

    __tablename__ = "wiadomosci_watku"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_watku: Mapped[str] = mapped_column(String(64), index=True)
    autor_rola: Mapped[str] = mapped_column(String(10))  # "uzytkownik" | "admin" | "mentor"
    tresc: Mapped[str] = mapped_column(Text)
    zrodla: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "powiadomienia"

    id: Mapped[int] = mapped_column(primary_key=True)
    tekst: Mapped[str] = mapped_column(String(500))
    zgloszenie_id: Mapped[int | None] = mapped_column(
        ForeignKey("zgloszenia.id", ondelete="CASCADE")
    )
    przeczytane: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AppSetting(Base):
    __tablename__ = "ustawienia"

    klucz: Mapped[str] = mapped_column(String(50), primary_key=True)
    wartosc: Mapped[float] = mapped_column(Float)
