from sqlalchemy import Boolean, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin

RODZAJE_OPINII = ("test", "ocena")
STATUSY_OPINII = ("nowa", "opublikowana", "ukryta")


class Opinia(TimestampMixin, Base):
    """Tester innowacji: zgłoszenie do testów albo ocena z feedbackiem.

    Publicznie widać tylko opinie zatwierdzone przez ROPS (`opublikowana`).
    """

    __tablename__ = "opinie"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(200), index=True)
    rodzaj: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(15), default="nowa", index=True)
    # 1-5, tylko przy ocenie.
    ocena: Mapped[int | None] = mapped_column(SmallInteger)
    # Typ instytucji (np. „OPS w gminie wiejskiej”), bez danych osobowych.
    instytucja: Mapped[str | None] = mapped_column(String(200))
    tresc: Mapped[str] = mapped_column(Text)
    usprawnienie: Mapped[str | None] = mapped_column(Text)
    # Zgłoszenie do testów trafia też do skrzynki panelu jako wątek.
    token_watku: Mapped[str | None] = mapped_column(String(64))
    syntetyczna: Mapped[bool] = mapped_column(Boolean, default=False)
