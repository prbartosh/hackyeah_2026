from sqlalchemy import JSON, Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Mentor(TimestampMixin, Base):
    """Mentor społeczny (ADR 0014): bez konta, wchodzi linkiem z tokenem po przydziale przez ROPS.

    `email` i `token_mentora` nigdy nie trafiają do publicznego API.
    """

    __tablename__ = "mentorzy"

    id: Mapped[int] = mapped_column(primary_key=True)
    nazwa: Mapped[str] = mapped_column(String(200))
    instytucja: Mapped[str] = mapped_column(String(200))
    sektor: Mapped[str] = mapped_column(String(15))
    obszary: Mapped[list[str]] = mapped_column(JSON, default=list)  # slugi kategorii
    powiat: Mapped[str] = mapped_column(String(50))
    opis: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(String(320))
    aktywny: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    token_mentora: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    syntetyczny: Mapped[bool] = mapped_column(Boolean, default=False)
