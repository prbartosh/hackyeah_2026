from typing import Any

from sqlalchemy import JSON, Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin

STATUSY_KARTY = ("szkic", "opublikowana", "zarchiwizowana")
POZIOMY_DOWODU = ("brak_danych", "zadeklarowany", "pilotaz", "przetestowany", "wdrozony")


class InnovationCard(TimestampMixin, Base):
    """Karta innowacji w bazie. Pola nazwane jak w innowacje.json."""

    __tablename__ = "innowacje"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    nazwa: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="szkic", index=True)
    zrodlo: Mapped[str] = mapped_column(String(20), default="panel")  # rops | dokument | panel
    kategorie: Mapped[list[str]] = mapped_column(JSON, default=list)
    wybrana_do_upowszechniania: Mapped[bool] = mapped_column(Boolean, default=False)
    opis: Mapped[str | None] = mapped_column(Text)
    problem: Mapped[str | None] = mapped_column(Text)
    grupa_docelowa: Mapped[str | None] = mapped_column(Text)
    kto_moze_skorzystac: Mapped[str | None] = mapped_column(Text)
    czy_dziala: Mapped[str | None] = mapped_column(Text)
    poziom_dowodu: Mapped[str | None] = mapped_column(String(20))
    organizacja: Mapped[str | None] = mapped_column(Text)
    url_zrodlowy: Mapped[str | None] = mapped_column(Text)
    pdf_url: Mapped[str | None] = mapped_column(Text)
    youtube_url: Mapped[str | None] = mapped_column(Text)
    materialy_url: Mapped[str | None] = mapped_column(Text)
    obraz_url: Mapped[str | None] = mapped_column(Text)
    licencja: Mapped[str | None] = mapped_column(Text)
    pobrano_dnia: Mapped[str | None] = mapped_column(String(20))
    # Nakładka: typowane listy; `wdrozenie` osobno.
    nakladka: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    wdrozenie: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    embedding: Mapped[list[float] | None] = mapped_column(JSON)
    embedding_model: Mapped[str | None] = mapped_column(String(80))
