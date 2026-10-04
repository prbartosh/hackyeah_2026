import logging
import secrets

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import Mentor, Notification, ThreadMessage, Ticket
from app.repositories.innovation import InnovationRepository
from app.repositories.mentor import MentorRepository
from app.schemas.mentor import (
    MentorAdmin,
    MentorInput,
    MentorMessageRead,
    MentorPublic,
    MentorThreadRead,
    MentorUpdate,
    TicketMentorRead,
)
from app.services.email import EmailSender
from app.services.errors import KreatorError

logger = logging.getLogger(__name__)


class MentorService:
    """Mentorzy: bez konta, dostęp linkiem z tokenem, przydział przez ROPS."""

    def __init__(
        self,
        session: AsyncSession,
        innovations: InnovationRepository,
        settings: Settings,
        email: EmailSender,
    ) -> None:
        self.session = session
        self.repo = MentorRepository(session)
        self.innovations = innovations
        self.settings = settings
        self.email = email

    def _check_areas(self, areas: list[str]) -> list[str]:
        known = {c.slug for c in self.innovations.categories()}
        unknown = [a for a in areas if a not in known]
        if unknown:
            raise KreatorError(f"Nieznany obszar: {unknown[0]}.", 422)
        return list(dict.fromkeys(areas))

    # --- publiczne ---

    async def list_public(self, obszar: str | None, powiat: str | None) -> list[MentorPublic]:
        rows = await self.repo.list(only_active=True)
        return [
            MentorPublic.model_validate(m, from_attributes=True)
            for m in rows
            if (not obszar or obszar in m.obszary) and (not powiat or m.powiat == powiat)
        ]

    async def request_mentor(self, thread_token: str) -> None:
        ticket = await self.repo.ticket_by_thread(thread_token)
        if ticket is None:
            raise KreatorError("Nie znaleziono rozmowy.", 404)
        if not ticket.mentor_prosba:
            ticket.mentor_prosba = True
            self.session.add(
                Notification(
                    tekst=f"Autor prosi o mentora w zgłoszeniu nr {ticket.id}",
                    zgloszenie_id=ticket.id,
                )
            )
            await self.session.commit()

    # --- dostęp mentora linkiem ---

    async def _assigned(self, mentor_token: str, thread_token: str) -> tuple[Mentor, Ticket]:
        """Mentor widzi tylko wątek zgłoszenia, do którego został przypisany."""
        mentor = await self.repo.get_by_token(mentor_token)
        ticket = await self.repo.ticket_by_thread(thread_token)
        if mentor is None or not mentor.aktywny or ticket is None or ticket.mentor_id != mentor.id:
            raise KreatorError("Nie znaleziono rozmowy.", 404)
        return mentor, ticket

    async def mentor_thread(self, mentor_token: str, thread_token: str) -> MentorThreadRead:
        mentor, _ = await self._assigned(mentor_token, thread_token)
        messages = await self.repo.messages(thread_token)
        return MentorThreadRead(
            mentor_nazwa=mentor.nazwa,
            wiadomosci=[
                MentorMessageRead(autor_rola=m.autor_rola, tresc=m.tresc, created_at=m.created_at)
                for m in messages
            ],
        )

    async def mentor_reply(self, mentor_token: str, thread_token: str, text: str) -> None:
        mentor, ticket = await self._assigned(mentor_token, thread_token)
        self.session.add(
            ThreadMessage(token_watku=thread_token, autor_rola="mentor", tresc=text.strip())
        )
        self.session.add(
            Notification(
                tekst=f"Mentor {mentor.nazwa} odpisał w zgłoszeniu nr {ticket.id}"[:500],
                zgloszenie_id=ticket.id,
            )
        )
        await self.session.commit()
        if ticket.autor_email:
            link = f"{self.settings.public_base_url}/watek/{ticket.token_watku}"
            await self._send(
                ticket.autor_email,
                "Mentor odpisał w Twojej sprawie",
                f"Mentor ({mentor.nazwa}) dopisał się do Twojego zgłoszenia.\n\nRozmowa: {link}\n",
            )

    # --- panel ---

    async def list_all(self) -> list[MentorAdmin]:
        rows = await self.repo.list(only_active=False)
        return [MentorAdmin.model_validate(m, from_attributes=True) for m in rows]

    async def create(self, data: MentorInput, *, synthetic: bool = False) -> MentorAdmin:
        payload = data.model_dump()
        payload["obszary"] = self._check_areas(data.obszary)
        mentor = Mentor(**payload, token_mentora=secrets.token_urlsafe(24), syntetyczny=synthetic)
        await self.repo.add(mentor)
        await self.session.commit()
        await self.session.refresh(mentor)
        return MentorAdmin.model_validate(mentor, from_attributes=True)

    async def update(self, mentor_id: int, data: MentorUpdate) -> MentorAdmin:
        mentor = await self._get(mentor_id)
        changes = data.model_dump(exclude_none=True)
        if "obszary" in changes:
            changes["obszary"] = self._check_areas(changes["obszary"])
        for key, value in changes.items():
            setattr(mentor, key, value)
        await self.session.commit()
        await self.session.refresh(mentor)
        return MentorAdmin.model_validate(mentor, from_attributes=True)

    async def _get(self, mentor_id: int) -> Mentor:
        mentor = await self.repo.get(mentor_id)
        if mentor is None:
            raise KreatorError("Nie znaleziono mentora.", 404)
        return mentor

    async def get_ticket(self, ticket_id: int) -> Ticket:
        ticket = await self.repo.get_ticket(ticket_id)
        if ticket is None:
            raise KreatorError("Nie znaleziono zgłoszenia.", 404)
        return ticket

    async def ticket_mentor(self, ticket: Ticket) -> TicketMentorRead:
        mentor = await self.repo.get(ticket.mentor_id) if ticket.mentor_id else None
        return TicketMentorRead(
            mentor_prosba=ticket.mentor_prosba,
            mentor=MentorAdmin.model_validate(mentor, from_attributes=True) if mentor else None,
        )

    async def assign(self, ticket: Ticket, mentor_id: int | None) -> TicketMentorRead:
        """Przydział przez ROPS: e-mail z linkiem do mentora i wiadomość systemowa w wątku."""
        if mentor_id is None:
            ticket.mentor_id = None
            await self.session.commit()
            return await self.ticket_mentor(ticket)
        mentor = await self._get(mentor_id)
        if not mentor.aktywny:
            raise KreatorError("Ten mentor jest nieaktywny.", 409)
        if ticket.mentor_id != mentor.id:
            ticket.mentor_id = mentor.id
            self.session.add(
                ThreadMessage(
                    token_watku=ticket.token_watku,
                    autor_rola="system",
                    tresc=f"Do sprawy dołączył mentor: {mentor.nazwa}",
                )
            )
            await self.session.commit()
            base = self.settings.public_base_url
            link = f"{base}/mentor/{mentor.token_mentora}/{ticket.token_watku}"
            await self._send(
                mentor.email,
                "ROPS Kraków prosi o wsparcie w sprawie",
                "Dzień dobry,\n\nROPS Kraków przydzielił Cię jako mentora do zgłoszenia "
                f"mieszkańca:\n\n{ticket.tresc[:300]}\n\nRozmowę i formularz odpowiedzi "
                f"znajdziesz pod linkiem (bez logowania, nie udostępniaj go dalej):\n{link}\n",
            )
        return await self.ticket_mentor(ticket)

    async def _send(self, to: str, subject: str, body: str) -> None:
        try:
            await self.email.send(to, subject, body)
        except Exception:  # zmiana jest już zapisana, e-mail nie może jej cofnąć
            logger.exception("Nie udało się wysłać e-maila (mentor): %s", subject)
