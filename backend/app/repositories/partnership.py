from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    PartnershipConversation,
    PartnershipConversationMessage,
    PartnershipOffer,
)


class PartnershipRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(
        self,
        row: PartnershipOffer | PartnershipConversation | PartnershipConversationMessage,
    ) -> None:
        self.session.add(row)
        await self.session.flush()

    async def get(self, offer_id: int) -> PartnershipOffer | None:
        return await self.session.get(PartnershipOffer, offer_id)

    async def list(
        self,
        *,
        status: str | None = None,
        typ: str | None = None,
        sektor: str | None = None,
        powiat: str | None = None,
        innowacja_slug: str | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[PartnershipOffer], int]:
        query = select(PartnershipOffer)
        filters = (
            (PartnershipOffer.status, status),
            (PartnershipOffer.typ, typ),
            (PartnershipOffer.sektor, sektor),
            (PartnershipOffer.powiat, powiat),
            (PartnershipOffer.innowacja_slug, innowacja_slug),
        )
        for column, value in filters:
            if value:
                query = query.where(column == value)
        total = await self.session.scalar(select(func.count()).select_from(query.subquery()))
        rows = await self.session.scalars(
            query.order_by(PartnershipOffer.created_at.desc(), PartnershipOffer.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(rows.all()), total or 0

    async def conversation_by_token(self, token: str) -> PartnershipConversation | None:
        return await self.session.scalar(
            select(PartnershipConversation).where(
                or_(
                    PartnershipConversation.token_nadawcy == token,
                    PartnershipConversation.token_autora == token,
                )
            )
        )

    async def conversation(self, conversation_id: int) -> PartnershipConversation | None:
        return await self.session.get(PartnershipConversation, conversation_id)

    async def conversation_messages(
        self, conversation_id: int
    ) -> list[PartnershipConversationMessage]:
        rows = await self.session.scalars(
            select(PartnershipConversationMessage)
            .where(PartnershipConversationMessage.rozmowa_id == conversation_id)
            .order_by(PartnershipConversationMessage.id)
        )
        return list(rows.all())

    async def list_conversations(
        self, offset: int, limit: int
    ) -> tuple[list[tuple[PartnershipConversation, str, int]], int]:
        """Rozmowy (ostatnio aktywne pierwsze) z tytułem ogłoszenia i liczbą wiadomości."""
        count = (
            select(
                PartnershipConversationMessage.rozmowa_id.label("rid"),
                func.count().label("n"),
            )
            .group_by(PartnershipConversationMessage.rozmowa_id)
            .subquery()
        )
        rows = await self.session.execute(
            select(PartnershipConversation, PartnershipOffer.tytul, func.coalesce(count.c.n, 0))
            .join(PartnershipOffer, PartnershipOffer.id == PartnershipConversation.ogloszenie_id)
            .outerjoin(count, count.c.rid == PartnershipConversation.id)
            .order_by(PartnershipConversation.updated_at.desc(), PartnershipConversation.id.desc())
            .offset(offset)
            .limit(limit)
        )
        total = await self.session.scalar(select(func.count()).select_from(PartnershipConversation))
        return [(c, t, n) for c, t, n in rows.all()], total or 0
