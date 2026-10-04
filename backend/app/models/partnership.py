from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin

TYPY_OGLOSZEN = ("szukam_partnera", "oferuje_wsparcie")
SEKTORY = ("publiczny", "ngo", "biznes", "nauka", "mieszkancy")
STATUSY_OGLOSZEN = ("oczekuje", "opublikowane", "odrzucone")


class PartnershipOffer(TimestampMixin, Base):
    """Ogłoszenie z Giełdy partnerstw (ADR 0013). Publicznie tylko po moderacji ROPS.

    `kontakt_email` nigdy nie trafia do publicznego API: kontakt idzie przez ROPS.
    """

    __tablename__ = "ogloszenia_partnerskie"

    id: Mapped[int] = mapped_column(primary_key=True)
    typ: Mapped[str] = mapped_column(String(20), index=True)
    sektor: Mapped[str] = mapped_column(String(15))
    instytucja: Mapped[str] = mapped_column(String(200))
    tytul: Mapped[str] = mapped_column(String(200))
    opis: Mapped[str] = mapped_column(Text)
    powiat: Mapped[str] = mapped_column(String(50))
    innowacja_slug: Mapped[str | None] = mapped_column(String(200))
    kontakt_email: Mapped[str] = mapped_column(String(320))
    status: Mapped[str] = mapped_column(String(15), default="oczekuje", index=True)
    syntetyczne: Mapped[bool] = mapped_column(Boolean, default=False)


class PartnershipMessage(TimestampMixin, Base):
    """Wiadomość do autora ogłoszenia, przekazana przez ROPS jako pośrednika."""

    __tablename__ = "wiadomosci_partnerskie"

    id: Mapped[int] = mapped_column(primary_key=True)
    ogloszenie_id: Mapped[int] = mapped_column(
        ForeignKey("ogloszenia_partnerskie.id", ondelete="CASCADE"), index=True
    )
    nadawca_nazwa: Mapped[str] = mapped_column(String(200))
    nadawca_email: Mapped[str] = mapped_column(String(320))
    tresc: Mapped[str] = mapped_column(Text)


STRONY_ROZMOWY = ("nadawca", "autor", "rops")
STATUSY_ROZMOW = ("otwarta", "zamknieta")


class PartnershipConversation(TimestampMixin, Base):
    """Rozmowa nadawcy z autorem ogłoszenia przez ROPS. Każda strona ma własny token w linku.

    `nadawca_email` jest prywatny: nie trafia do widoku rozmowy, widzi go tylko panel ROPS.
    """

    __tablename__ = "rozmowy_partnerskie"

    id: Mapped[int] = mapped_column(primary_key=True)
    ogloszenie_id: Mapped[int] = mapped_column(
        ForeignKey("ogloszenia_partnerskie.id", ondelete="CASCADE"), index=True
    )
    nadawca_nazwa: Mapped[str] = mapped_column(String(200))
    nadawca_email: Mapped[str] = mapped_column(String(320))
    token_nadawcy: Mapped[str] = mapped_column(String(64), unique=True)
    token_autora: Mapped[str] = mapped_column(String(64), unique=True)
    status: Mapped[str] = mapped_column(String(10), default="otwarta")


class PartnershipConversationMessage(TimestampMixin, Base):
    __tablename__ = "wiadomosci_rozmow"

    id: Mapped[int] = mapped_column(primary_key=True)
    rozmowa_id: Mapped[int] = mapped_column(
        ForeignKey("rozmowy_partnerskie.id", ondelete="CASCADE"), index=True
    )
    strona: Mapped[str] = mapped_column(String(10))
    tresc: Mapped[str] = mapped_column(Text)
