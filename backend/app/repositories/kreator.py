from collections.abc import Sequence
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Canva, Fiszka, Nabor, SzablonCanvy, Wniosek


class FiszkaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, token: str) -> Fiszka | None:
        return await self.session.scalar(select(Fiszka).where(Fiszka.token == token))

    async def by_id(self, fiszka_id: int) -> Fiszka | None:
        return await self.session.get(Fiszka, fiszka_id)

    async def add(self, fiszka: Fiszka) -> Fiszka:
        self.session.add(fiszka)
        await self.session.flush()
        return fiszka


class NaborRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, slug: str) -> Nabor | None:
        return await self.session.scalar(select(Nabor).where(Nabor.slug == slug))

    async def by_id(self, nabor_id: int) -> Nabor | None:
        return await self.session.get(Nabor, nabor_id)

    async def count(self) -> int:
        return await self.session.scalar(select(func.count(Nabor.id))) or 0

    async def list(self, *, offset: int, limit: int) -> tuple[Sequence[Nabor], int]:
        total = await self.count()
        rows = await self.session.scalars(
            select(Nabor).order_by(Nabor.termin_od.desc(), Nabor.id).offset(offset).limit(limit)
        )
        return rows.all(), total

    async def active(self, today: date) -> Sequence[Nabor]:
        rows = await self.session.scalars(
            select(Nabor)
            .where(Nabor.termin_od <= today, Nabor.termin_do >= today)
            .order_by(Nabor.termin_do, Nabor.id)
        )
        return rows.all()

    async def next_upcoming(self, today: date) -> Nabor | None:
        return await self.session.scalar(
            select(Nabor).where(Nabor.termin_od > today).order_by(Nabor.termin_od).limit(1)
        )

    async def last_finished(self, today: date) -> Nabor | None:
        return await self.session.scalar(
            select(Nabor).where(Nabor.termin_do < today).order_by(Nabor.termin_do.desc()).limit(1)
        )

    async def add(self, nabor: Nabor) -> Nabor:
        self.session.add(nabor)
        await self.session.flush()
        return nabor


class WniosekRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, token: str) -> Wniosek | None:
        return await self.session.scalar(select(Wniosek).where(Wniosek.token == token))

    async def for_pair(self, fiszka_id: int, nabor_id: int) -> Wniosek | None:
        return await self.session.scalar(
            select(Wniosek).where(Wniosek.fiszka_id == fiszka_id, Wniosek.nabor_id == nabor_id)
        )

    async def add(self, wniosek: Wniosek) -> Wniosek:
        self.session.add(wniosek)
        await self.session.flush()
        return wniosek


class CanvaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def template(self, slug: str) -> SzablonCanvy | None:
        return await self.session.get(SzablonCanvy, slug)

    async def templates(self) -> Sequence[SzablonCanvy]:
        return (await self.session.scalars(select(SzablonCanvy).order_by(SzablonCanvy.nazwa))).all()

    async def get(self, token: str) -> Canva | None:
        return await self.session.scalar(select(Canva).where(Canva.token == token))

    async def add(self, canva: Canva) -> Canva:
        self.session.add(canva)
        await self.session.flush()
        return canva
