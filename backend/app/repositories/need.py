from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Potrzeba


class PotrzebaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, potrzeba: Potrzeba) -> Potrzeba:
        self.session.add(potrzeba)
        await self.session.flush()
        return potrzeba

    async def recent(self, limit: int = 2000) -> list[Potrzeba]:
        """Najnowsze zapisane potrzeby; filtrowanie po slugach w Pythonie (ARRAY lub JSON)."""
        rows = await self.session.scalars(
            select(Potrzeba).order_by(Potrzeba.id.desc()).limit(limit)
        )
        return list(rows)
