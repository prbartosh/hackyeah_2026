from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# text[] w PostgreSQL; JSON w SQLite z testów.
SlugList = ARRAY(Text).with_variant(JSON(), "sqlite")


class Potrzeba(Base):
    """Potrzeba z czatu przy każdym `show_results`: same slugi, bez tekstu rozmowy."""

    __tablename__ = "potrzeby"

    id: Mapped[int] = mapped_column(primary_key=True)
    rola: Mapped[str | None] = mapped_column(String(20))
    grupy_docelowe: Mapped[list[str]] = mapped_column(SlugList, default=list)
    problemy: Mapped[list[str]] = mapped_column(SlugList, default=list)
    miejsca: Mapped[list[str]] = mapped_column(SlugList, default=list)
    skale: Mapped[list[str]] = mapped_column(SlugList, default=list)
    zasoby: Mapped[list[str]] = mapped_column(SlugList, default=list)
    proby: Mapped[list[str]] = mapped_column(SlugList, default=list)
    # Slugi pokazanych innowacji, wynik główny pierwszy.
    innowacje: Mapped[list[str]] = mapped_column(SlugList, default=list)
    brak_dopasowania: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
