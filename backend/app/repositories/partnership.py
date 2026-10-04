from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PartnershipMessage, PartnershipOffer


class PartnershipRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, row: PartnershipOffer | PartnershipMessage) -> None:
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
