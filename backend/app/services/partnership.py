import logging
import secrets
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import (
    Notification,
    PartnershipConversation,
    PartnershipConversationMessage,
    PartnershipOffer,
)
from app.repositories.innovation import InnovationRepository
from app.repositories.partnership import PartnershipRepository
from app.schemas.partnership import (
    ContactCreate,
    ContactCreated,
    ConversationAdmin,
    ConversationAdminItem,
    ConversationAdminList,
    ConversationMessage,
    ConversationView,
    MessageCreate,
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
    """Giełda partnerstw: moderacja przed publikacją, kontakt przez ROPS."""

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

    def _link(self, token: str) -> str:
        return f"{settings.public_base_url}/rozmowa/{token}"

    async def _mail(self, to: str, subject: str, body: str, conversation_id: int) -> None:
        try:
            await self.email.send(to, subject, body)
        except Exception:  # wiadomość jest już zapisana i widoczna dla ROPS
            logger.exception(
                "Nie udało się wysłać e-maila rozmowy partnerskiej %s", conversation_id
            )

    async def contact(self, offer_id: int, data: ContactCreate) -> ContactCreated:
        """Otwiera rozmowę z autorem ogłoszenia. Adresy stron nie są ujawniane drugiej stronie."""
        offer = await self.repo.get(offer_id)
        if offer is None or offer.status != "opublikowane":
            raise KreatorError("Nie znaleziono ogłoszenia.", 404)
        name = data.nadawca_nazwa.strip()
        text = data.tresc.strip()
        conversation = PartnershipConversation(
            ogloszenie_id=offer.id,
            nadawca_nazwa=name,
            nadawca_email=data.nadawca_email.strip(),
            token_nadawcy=secrets.token_urlsafe(24),
            token_autora=secrets.token_urlsafe(24),
            status="otwarta",
        )
        await self.repo.add(conversation)
        await self.repo.add(
            PartnershipConversationMessage(rozmowa_id=conversation.id, strona="nadawca", tresc=text)
        )
        self.session.add(
            Notification(tekst=f"Nowa rozmowa partnerska w sprawie ogłoszenia: {offer.tytul}"[:500])
        )
        await self.session.commit()
        await self._mail(
            offer.kontakt_email,
            "Wiadomość w sprawie ogłoszenia",
            f"Dzień dobry,\n\nw sprawie Twojego ogłoszenia „{offer.tytul}” w Giełdzie partnerstw "
            f"Splotu napisał(a): {name}.\n\n{text}\n\n"
            f"Odpowiedz w rozmowie: {self._link(conversation.token_autora)}\n\n"
            "Wiadomość przekazuje ROPS Kraków. Adresy e-mail stron nie są ujawniane.\n",
            conversation.id,
        )
        await self._mail(
            conversation.nadawca_email,
            "Twoja rozmowa w Giełdzie partnerstw",
            f"Dzień dobry,\n\nTwoja wiadomość w sprawie ogłoszenia „{offer.tytul}” trafiła do "
            f"autora przez ROPS Kraków. Odpowiedź zobaczysz tutaj: "
            f"{self._link(conversation.token_nadawcy)}\n\nZachowaj ten link: to Twój dostęp do "
            "rozmowy. Twój adres e-mail nie jest widoczny dla drugiej strony.\n",
            conversation.id,
        )
        return ContactCreated(
            status="przekazane", token_rozmowy=conversation.token_nadawcy, tytul=offer.tytul
        )

    async def _by_token(self, token: str) -> tuple[PartnershipConversation, PartnershipOffer]:
        conversation = await self.repo.conversation_by_token(token)
        offer = await self.repo.get(conversation.ogloszenie_id) if conversation else None
        if conversation is None or offer is None:
            raise KreatorError("Nie znaleziono rozmowy.", 404)
        return conversation, offer

    async def _messages(self, conversation_id: int) -> list[ConversationMessage]:
        rows = await self.repo.conversation_messages(conversation_id)
        return [ConversationMessage.model_validate(r, from_attributes=True) for r in rows]

    async def view(self, token: str) -> ConversationView:
        conversation, offer = await self._by_token(token)
        is_sender = token == conversation.token_nadawcy
        return ConversationView(
            tytul=offer.tytul,
            status=conversation.status,
            twoja_strona="nadawca" if is_sender else "autor",
            druga_strona=offer.instytucja if is_sender else conversation.nadawca_nazwa,
            wiadomosci=await self._messages(conversation.id),
        )

    async def reply(self, token: str, data: MessageCreate) -> ConversationView:
        conversation, offer = await self._by_token(token)
        if conversation.status != "otwarta":
            raise KreatorError("Ta rozmowa została zamknięta.", 409)
        is_sender = token == conversation.token_nadawcy
        text = data.tresc.strip()
        await self._append(conversation, "nadawca" if is_sender else "autor", text)
        if is_sender:
            to, other_token, who = offer.kontakt_email, conversation.token_autora, "Nadawca"
        else:
            to, other_token, who = conversation.nadawca_email, conversation.token_nadawcy, "Autor"
        await self._mail(
            to,
            "Nowa wiadomość w rozmowie partnerskiej",
            f"{who} odpisał(a) w rozmowie „{offer.tytul}”:\n\n{text}\n\n"
            f"Odpowiedz tutaj: {self._link(other_token)}\n",
            conversation.id,
        )
        return await self.view(token)

    async def _append(self, conversation: PartnershipConversation, strona: str, text: str) -> None:
        await self.repo.add(
            PartnershipConversationMessage(rozmowa_id=conversation.id, strona=strona, tresc=text)
        )
        conversation.updated_at = datetime.now(UTC)
        await self.session.commit()

    async def list_conversations(self, offset: int, limit: int) -> ConversationAdminList:
        rows, total = await self.repo.list_conversations(offset, limit)
        return ConversationAdminList(
            items=[
                ConversationAdminItem(
                    id=c.id,
                    ogloszenie_id=c.ogloszenie_id,
                    tytul=title,
                    nadawca_nazwa=c.nadawca_nazwa,
                    status=c.status,
                    liczba_wiadomosci=count,
                    created_at=c.created_at,
                    updated_at=c.updated_at,
                )
                for c, title, count in rows
            ],
            total=total,
        )

    async def _admin_conversation(
        self, conversation_id: int
    ) -> tuple[PartnershipConversation, PartnershipOffer]:
        conversation = await self.repo.conversation(conversation_id)
        offer = await self.repo.get(conversation.ogloszenie_id) if conversation else None
        if conversation is None or offer is None:
            raise KreatorError("Nie znaleziono rozmowy.", 404)
        return conversation, offer

    async def admin_view(self, conversation_id: int) -> ConversationAdmin:
        conversation, offer = await self._admin_conversation(conversation_id)
        return ConversationAdmin(
            id=conversation.id,
            ogloszenie_id=offer.id,
            tytul=offer.tytul,
            instytucja=offer.instytucja,
            nadawca_nazwa=conversation.nadawca_nazwa,
            nadawca_email=conversation.nadawca_email,
            kontakt_email=offer.kontakt_email,
            status=conversation.status,
            wiadomosci=await self._messages(conversation.id),
        )

    async def close(self, conversation_id: int) -> ConversationAdmin:
        conversation, _ = await self._admin_conversation(conversation_id)
        conversation.status = "zamknieta"
        await self.session.commit()
        return await self.admin_view(conversation_id)

    async def rops_message(self, conversation_id: int, data: MessageCreate) -> ConversationAdmin:
        conversation, offer = await self._admin_conversation(conversation_id)
        if conversation.status != "otwarta":
            raise KreatorError("Ta rozmowa została zamknięta.", 409)
        text = data.tresc.strip()
        await self._append(conversation, "rops", text)
        for to, token in (
            (offer.kontakt_email, conversation.token_autora),
            (conversation.nadawca_email, conversation.token_nadawcy),
        ):
            await self._mail(
                to,
                "Wiadomość od ROPS w rozmowie partnerskiej",
                f"ROPS Kraków napisał(a) w rozmowie „{offer.tytul}”:\n\n{text}\n\n"
                f"Rozmowa: {self._link(token)}\n",
                conversation.id,
            )
        return await self.admin_view(conversation_id)

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
