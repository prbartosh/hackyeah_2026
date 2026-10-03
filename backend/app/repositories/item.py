from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Item


class ItemRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, item_id: int) -> Item | None:
        return await self.session.get(Item, item_id)

    async def list(self, offset: int = 0, limit: int = 100) -> Sequence[Item]:
        result = await self.session.scalars(select(Item).offset(offset).limit(limit))
        return result.all()

    async def add(self, item: Item) -> Item:
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def delete(self, item: Item) -> None:
        await self.session.delete(item)
