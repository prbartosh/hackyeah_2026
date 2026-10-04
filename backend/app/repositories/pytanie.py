from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Pytanie


class PytanieRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, row: Pytanie) -> None:
        self.session.add(row)
        await self.session.flush()

    async def get(self, pytanie_id: int) -> Pytanie | None:
        return await self.session.get(Pytanie, pytanie_id)

    async def published(self, kategoria: str | None = None) -> list[Pytanie]:
        """Opublikowane, najnowsza odpowiedź pierwsza. Wyszukiwanie tekstu robi serwis."""
        query = select(Pytanie).where(Pytanie.status == "opublikowane")
        if kategoria:
            query = query.where(Pytanie.kategoria == kategoria)
        rows = await self.session.scalars(
            query.order_by(Pytanie.odpowiedziano.desc(), Pytanie.id.desc())
        )
        return list(rows.all())

    async def list(
        self, *, status: str | None, offset: int, limit: int
    ) -> tuple[list[Pytanie], int]:
        query = select(Pytanie)
        if status:
            query = query.where(Pytanie.status == status)
        total = await self.session.scalar(select(func.count()).select_from(query.subquery()))
        rows = await self.session.scalars(
            query.order_by(Pytanie.created_at.desc(), Pytanie.id.desc()).offset(offset).limit(limit)
        )
        return list(rows.all()), total or 0
