from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import PytanieServiceDep
from app.schemas.pytanie import OdpowiedzUpdate, PytanieAdmin, PytanieAdminList, StatusPytania

router = APIRouter()


@router.get("/pytania", response_model=PytanieAdminList, summary="Pytania do ROPS")
async def list_pytania(
    service: PytanieServiceDep,
    status: StatusPytania | None = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> PytanieAdminList:
    return await service.list_all(status, offset, limit)


@router.post("/pytania/{pytanie_id}/odpowiedz", response_model=PytanieAdmin, summary="Odpowiedź")
async def answer(
    pytanie_id: int, data: OdpowiedzUpdate, service: PytanieServiceDep
) -> PytanieAdmin:
    return await service.answer(pytanie_id, data.odpowiedz)


@router.post(
    "/pytania/{pytanie_id}/publikuj", response_model=PytanieAdmin, summary="Publikacja (za zgodą)"
)
async def publish(pytanie_id: int, service: PytanieServiceDep) -> PytanieAdmin:
    return await service.publish(pytanie_id)


@router.post("/pytania/{pytanie_id}/ukryj", response_model=PytanieAdmin, summary="Ukrycie")
async def hide(pytanie_id: int, service: PytanieServiceDep) -> PytanieAdmin:
    return await service.hide(pytanie_id)
