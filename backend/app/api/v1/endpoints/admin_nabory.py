from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import NaborServiceDep, TodayDep
from app.schemas.kreator import NaborInput, NaborRead

router = APIRouter()


@router.get("/nabory", summary="Wszystkie nabory (także zakończone i zaplanowane)")
async def list_nabory(
    service: NaborServiceDep,
    today: TodayDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> dict:
    items, total = await service.list_all(offset, limit, today)
    return {"items": items, "total": total}


@router.post("/nabory", response_model=NaborRead, status_code=status.HTTP_201_CREATED)
async def create_nabor(data: NaborInput, service: NaborServiceDep, today: TodayDep) -> NaborRead:
    return await service.create(data, today)


@router.get("/nabory/{slug}", response_model=NaborRead)
async def get_nabor(slug: str, service: NaborServiceDep, today: TodayDep) -> NaborRead:
    return await service.get(slug, today)


@router.put("/nabory/{slug}", response_model=NaborRead)
async def update_nabor(
    slug: str, data: NaborInput, service: NaborServiceDep, today: TodayDep
) -> NaborRead:
    return await service.update(slug, data, today)
