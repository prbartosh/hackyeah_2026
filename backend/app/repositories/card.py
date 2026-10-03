from collections.abc import Sequence

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import InnovationCard


class CardRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, slug: str) -> InnovationCard | None:
        return await self.session.scalar(select(InnovationCard).where(InnovationCard.slug == slug))

    async def count(self) -> int:
        return await self.session.scalar(select(func.count(InnovationCard.id))) or 0

    async def list(
        self, *, status: str | None, q: str | None, offset: int, limit: int
    ) -> tuple[Sequence[InnovationCard], int]:
        query = select(InnovationCard)
        if status:
            query = query.where(InnovationCard.status == status)
        if q:
            like = f"%{q.lower()}%"
            query = query.where(
                or_(
                    func.lower(InnovationCard.nazwa).like(like),
                    func.lower(InnovationCard.slug).like(like),
                )
            )
        total = await self.session.scalar(select(func.count()).select_from(query.subquery())) or 0
        rows = await self.session.scalars(
            query.order_by(InnovationCard.updated_at.desc(), InnovationCard.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return rows.all(), total

    async def all(self) -> Sequence[InnovationCard]:
        return (await self.session.scalars(select(InnovationCard))).all()

    async def published(self) -> Sequence[InnovationCard]:
        rows = await self.session.scalars(
            select(InnovationCard).where(InnovationCard.status == "opublikowana")
        )
        return rows.all()

    async def add(self, card: InnovationCard) -> InnovationCard:
        self.session.add(card)
        await self.session.flush()
        return card
