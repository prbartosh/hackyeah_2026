from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Mentor, ThreadMessage, Ticket


class MentorRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, mentor: Mentor) -> None:
        self.session.add(mentor)
        await self.session.flush()

    async def get(self, mentor_id: int) -> Mentor | None:
        return await self.session.get(Mentor, mentor_id)

    async def get_by_token(self, token: str) -> Mentor | None:
        return await self.session.scalar(select(Mentor).where(Mentor.token_mentora == token))

    async def get_ticket(self, ticket_id: int) -> Ticket | None:
        return await self.session.get(Ticket, ticket_id)

    async def ticket_by_thread(self, thread_token: str) -> Ticket | None:
        return await self.session.scalar(select(Ticket).where(Ticket.token_watku == thread_token))

    async def messages(self, thread_token: str) -> list[ThreadMessage]:
        rows = await self.session.scalars(
            select(ThreadMessage)
            .where(ThreadMessage.token_watku == thread_token)
            .order_by(ThreadMessage.created_at, ThreadMessage.id)
        )
        return list(rows.all())

    async def list(self, *, only_active: bool) -> list[Mentor]:
        query = select(Mentor).order_by(Mentor.nazwa, Mentor.id)
        if only_active:
            query = query.where(Mentor.aktywny.is_(True))
        return list((await self.session.scalars(query)).all())
