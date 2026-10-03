from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import SessionDep
from app.schemas import ItemCreate, ItemRead, ItemUpdate
from app.services.item import ItemNotFoundError, ItemService

router = APIRouter()


@router.get("", response_model=list[ItemRead])
async def list_items(
    session: SessionDep,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return await ItemService(session).list(offset, limit)


@router.get("/{item_id}", response_model=ItemRead)
async def get_item(item_id: int, session: SessionDep):
    try:
        return await ItemService(session).get(item_id)
    except ItemNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found") from None


@router.post("", response_model=ItemRead, status_code=status.HTTP_201_CREATED)
async def create_item(data: ItemCreate, session: SessionDep):
    return await ItemService(session).create(data)


@router.patch("/{item_id}", response_model=ItemRead)
async def update_item(item_id: int, data: ItemUpdate, session: SessionDep):
    try:
        return await ItemService(session).update(item_id, data)
    except ItemNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found") from None


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: int, session: SessionDep) -> None:
    try:
        await ItemService(session).delete(item_id)
    except ItemNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found") from None
