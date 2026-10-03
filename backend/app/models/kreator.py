from datetime import date
from typing import Any

from sqlalchemy import JSON, Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin

ETAPY = ("pomysl", "test_mikroskala", "wdrozone_lokalnie")
STATUSY_FISZKI = ("szkic", "wyslana")


class Fiszka(TimestampMixin, Base):
    """Fiszka pomysłu. Autor bez konta wraca przez `token` (sekret w adresie, jak wątek)."""

    __tablename__ = "fiszki"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(10), default="szkic", index=True)
    opis_wlasny: Mapped[str | None] = mapped_column(Text)
    istota: Mapped[str | None] = mapped_column(Text)
    odbiorca: Mapped[str | None] = mapped_column(Text)
    etap: Mapped[str | None] = mapped_column(String(20))
    obszar: Mapped[str | None] = mapped_column(String(100))
    lokalizacja: Mapped[str | None] = mapped_column(String(200))
    potrzeby: Mapped[str | None] = mapped_column(Text)
    # Pola wstępnie wypełnione przez AI (do oznaczenia w UI); użytkownik zawsze może je zmienić.
    pola_ai: Mapped[list[str]] = mapped_column(JSON, default=list)
    karta_slug: Mapped[str | None] = mapped_column(String(200))
    token_watku: Mapped[str | None] = mapped_column(String(64))
    syntetyczna: Mapped[bool] = mapped_column(Boolean, default=False)


class Nabor(TimestampMixin, Base):
    """Nabór grantowy jako dane: terminy, pola wniosku z limitami, kryteria oceny."""

    __tablename__ = "nabory"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    nazwa: Mapped[str] = mapped_column(String(300))
    organizator: Mapped[str | None] = mapped_column(String(300))
    opis: Mapped[str | None] = mapped_column(Text)
    url_zrodlowy: Mapped[str | None] = mapped_column(Text)
    termin_od: Mapped[date] = mapped_column(Date, index=True)
    termin_do: Mapped[date] = mapped_column(Date, index=True)
    # [{klucz, etykieta, limit, wskazowka, zrodla: [pola fiszki]}]
    pola: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    # [{nazwa, opis}]
    kryteria: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    # Slugi kategorii ROPS, do których nabór pasuje (dopasowanie „Znajdź finansowanie”).
    obszary: Mapped[list[str]] = mapped_column(JSON, default=list)
    # Słowa kluczowe odbiorców (np. „senior”), dopasowywane do pola „dla kogo”.
    odbiorcy: Mapped[list[str]] = mapped_column(JSON, default=list)
    syntetyczny: Mapped[bool] = mapped_column(Boolean, default=False)


class Wniosek(TimestampMixin, Base):
    __tablename__ = "wnioski"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    fiszka_id: Mapped[int] = mapped_column(ForeignKey("fiszki.id", ondelete="CASCADE"))
    nabor_id: Mapped[int] = mapped_column(ForeignKey("nabory.id", ondelete="CASCADE"))
    # {klucz: {tekst, wygenerowany, zrodlo: "ai"|"fiszka"|"brak", uzyte_pola: [..]}}
    pola: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(10), default="szkic")
    token_watku: Mapped[str | None] = mapped_column(String(64))
    komunikat_ai: Mapped[str | None] = mapped_column(Text)


class SzablonCanvy(Base):
    __tablename__ = "szablony_canvy"

    slug: Mapped[str] = mapped_column(String(100), primary_key=True)
    nazwa: Mapped[str] = mapped_column(String(300))
    opis: Mapped[str | None] = mapped_column(Text)
    url_zrodlowy: Mapped[str | None] = mapped_column(Text)
    # [{klucz, grupa, tytul, podpowiedz, pytania: [..]}]
    sekcje: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)


class Canva(TimestampMixin, Base):
    __tablename__ = "canvy"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    szablon_slug: Mapped[str] = mapped_column(ForeignKey("szablony_canvy.slug"))
    tytul: Mapped[str] = mapped_column(String(300), default="")
    fiszka_id: Mapped[int | None] = mapped_column(ForeignKey("fiszki.id", ondelete="SET NULL"))
    wartosci: Mapped[dict[str, str]] = mapped_column(JSON, default=dict)
    syntetyczna: Mapped[bool] = mapped_column(Boolean, default=False)
