from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Opinia


class OpiniaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, opinia: Opinia) -> Opinia:
        self.session.add(opinia)
        await self.session.flush()
        return opinia

    async def get(self, opinia_id: int) -> Opinia | None:
        return await self.session.get(Opinia, opinia_id)

    async def published(self, slug: str) -> list[Opinia]:
        query = (
            select(Opinia)
            .where(Opinia.slug == slug, Opinia.status == "opublikowana")
            .order_by(Opinia.created_at.desc(), Opinia.id.desc())
        )
        return list((await self.session.scalars(query)).all())

    async def list_all(
        self, status: str | None, offset: int, limit: int
    ) -> tuple[list[Opinia], int]:
        query = select(Opinia)
        if status:
            query = query.where(Opinia.status == status)
        total = await self.session.scalar(select(func.count()).select_from(query.subquery()))
        rows = await self.session.scalars(
            query.order_by(Opinia.created_at.desc(), Opinia.id.desc()).offset(offset).limit(limit)
        )
        return list(rows.all()), total or 0

    async def testers(self, slug: str) -> list[Opinia]:
        """Zatwierdzone zgłoszenia do testów z wątkiem, przez który ROPS może się skontaktować."""
        query = (
            select(Opinia)
            .where(
                Opinia.slug == slug,
                Opinia.rodzaj == "test",
                Opinia.status == "opublikowana",
                Opinia.token_watku.is_not(None),
            )
            .order_by(Opinia.created_at.desc(), Opinia.id.desc())
        )
        return list((await self.session.scalars(query)).all())
