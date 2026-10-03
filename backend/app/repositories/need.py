from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Potrzeba


class PotrzebaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, potrzeba: Potrzeba) -> Potrzeba:
        self.session.add(potrzeba)
        await self.session.flush()
        return potrzeba
