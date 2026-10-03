from collections.abc import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Item
from app.repositories.item import ItemRepository
from app.schemas import ItemCreate, ItemUpdate


class ItemNotFoundError(Exception):
    pass


class ItemService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ItemRepository(session)

    async def get(self, item_id: int) -> Item:
        item = await self.repo.get(item_id)
        if item is None:
            raise ItemNotFoundError(item_id)
        return item

    async def list(self, offset: int, limit: int) -> Sequence[Item]:
        return await self.repo.list(offset, limit)

    async def create(self, data: ItemCreate) -> Item:
        item = await self.repo.add(Item(**data.model_dump()))
        await self.session.commit()
        return item

    async def update(self, item_id: int, data: ItemUpdate) -> Item:
        item = await self.get(item_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def delete(self, item_id: int) -> None:
        item = await self.get(item_id)
        await self.repo.delete(item)
        await self.session.commit()
