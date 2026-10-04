import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification, PartnershipMessage, PartnershipOffer
from app.repositories.innovation import InnovationRepository
from app.repositories.partnership import PartnershipRepository
from app.schemas.partnership import (
    ContactCreate,
    OfferAdmin,
    OfferAdminList,
    OfferCreate,
    OfferCreated,
    OfferPublic,
)
from app.services.email import EmailSender
from app.services.errors import KreatorError

logger = logging.getLogger(__name__)


class PartnershipService:
    """Giełda partnerstw (ADR 0013): moderacja przed publikacją, kontakt przez ROPS."""

    def __init__(
        self,
        session: AsyncSession,
        innovations: InnovationRepository,
        email: EmailSender,
    ) -> None:
        self.session = session
        self.repo = PartnershipRepository(session)
        self.innovations = innovations
        self.email = email

    async def create(self, data: OfferCreate) -> OfferCreated:
        if data.innowacja_slug and self.innovations.get(data.innowacja_slug) is None:
            raise KreatorError("Nie znaleziono wskazanej innowacji.", 404)
        offer = PartnershipOffer(
            typ=data.typ,
            sektor=data.sektor,
            instytucja=data.instytucja.strip(),
            tytul=data.tytul.strip(),
            opis=data.opis.strip(),
            powiat=data.powiat,
            innowacja_slug=data.innowacja_slug,
            kontakt_email=data.kontakt_email.strip(),
            status="oczekuje",
        )
        await self.repo.add(offer)
        self.session.add(
            Notification(tekst=f"Nowe ogłoszenie partnerskie do moderacji: {offer.tytul}"[:500])
        )
        await self.session.commit()
        return OfferCreated(id=offer.id, status="oczekuje")

    async def list_public(
        self,
        typ: str | None,
        sektor: str | None,
        powiat: str | None,
        innowacja_slug: str | None,
        offset: int,
        limit: int,
    ) -> list[OfferPublic]:
        rows, _ = await self.repo.list(
            status="opublikowane",
            typ=typ,
            sektor=sektor,
            powiat=powiat,
            innowacja_slug=innowacja_slug,
            offset=offset,
            limit=limit,
        )
        return [OfferPublic.model_validate(r, from_attributes=True) for r in rows]

    async def contact(self, offer_id: int, data: ContactCreate) -> None:
        """Zapisuje wiadomość i przekazuje autorowi od ROPS. Adresy stron nie są ujawniane."""
        offer = await self.repo.get(offer_id)
        if offer is None or offer.status != "opublikowane":
            raise KreatorError("Nie znaleziono ogłoszenia.", 404)
        await self.repo.add(
            PartnershipMessage(
                ogloszenie_id=offer.id,
                nadawca_nazwa=data.nadawca_nazwa.strip(),
                nadawca_email=data.nadawca_email.strip(),
                tresc=data.tresc.strip(),
            )
        )
        self.session.add(
            Notification(tekst=f"Wiadomość do autora ogłoszenia partnerskiego: {offer.tytul}"[:500])
        )
        await self.session.commit()
        body = (
            f"Dzień dobry,\n\nw sprawie Twojego ogłoszenia „{offer.tytul}” w Giełdzie partnerstw "
            f"Splotu napisał(a): {data.nadawca_nazwa.strip()}.\n\n{data.tresc.strip()}\n\n"
            "Wiadomość przekazuje ROPS Kraków. Twój adres nie został ujawniony nadawcy; "
            "pracownik ROPS skontaktuje się z Tobą w sprawie dalszych kroków.\n"
        )
        try:
            await self.email.send(offer.kontakt_email, "Wiadomość w sprawie ogłoszenia", body)
        except Exception:  # wiadomość jest już zapisana i widoczna dla ROPS
            logger.exception("Nie udało się przekazać wiadomości partnerskiej %s", offer.id)

    async def list_all(self, status: str | None, offset: int, limit: int) -> OfferAdminList:
        rows, total = await self.repo.list(status=status, offset=offset, limit=limit)
        return OfferAdminList(
            items=[OfferAdmin.model_validate(r, from_attributes=True) for r in rows], total=total
        )

    async def set_status(self, offer_id: int, status: str) -> OfferAdmin:
        offer = await self.repo.get(offer_id)
        if offer is None:
            raise KreatorError("Nie znaleziono ogłoszenia.", 404)
        offer.status = status
        await self.session.commit()
        await self.session.refresh(offer)
        return OfferAdmin.model_validate(offer, from_attributes=True)
