from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin

STATUSY_PYTAN = ("nowe", "odpowiedziane", "opublikowane", "ukryte")


class Pytanie(TimestampMixin, Base):
    """Pytanie do ROPS (ADR 0015). Publiczne dopiero po odpowiedzi, za zgodą i decyzji ROPS.

    `autor_email` nigdy nie trafia do publicznego API.
    """

    __tablename__ = "pytania"

    id: Mapped[int] = mapped_column(primary_key=True)
    tresc: Mapped[str] = mapped_column(Text)
    kategoria: Mapped[str | None] = mapped_column(String(100))
    autor_nazwa: Mapped[str | None] = mapped_column(String(200))
    autor_email: Mapped[str | None] = mapped_column(String(320))
    zgoda_na_publikacje: Mapped[bool] = mapped_column(Boolean, default=False)
    odpowiedz: Mapped[str | None] = mapped_column(Text)
    odpowiedziano: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(15), default="nowe", index=True)
    syntetyczne: Mapped[bool] = mapped_column(Boolean, default=False)
