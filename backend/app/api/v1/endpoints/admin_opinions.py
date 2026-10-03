from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import OpinionServiceDep
from app.schemas.opinion import OpiniaAdmin, OpiniaStatusUpdate, OpinieAdminList, StatusOpinii

router = APIRouter()


@router.get("/opinie", response_model=OpinieAdminList, summary="Testy i oceny do moderacji")
async def list_opinions(
    service: OpinionServiceDep,
    status: StatusOpinii | None = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> OpinieAdminList:
    return await service.list_all(status, offset, limit)


@router.patch("/opinie/{opinia_id}", response_model=OpiniaAdmin, summary="Publikacja lub ukrycie")
async def update_opinion(
    opinia_id: int, data: OpiniaStatusUpdate, service: OpinionServiceDep
) -> OpiniaAdmin:
    return await service.set_status(opinia_id, data.status)
