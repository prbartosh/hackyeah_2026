from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import PytanieServiceDep
from app.schemas.pytanie import PytanieCreate, PytanieCreated, PytaniePublic

# Publiczne: pytania do ROPS bez konta; lista tylko opublikowanych, bez e-maila (ADR 0015).
router = APIRouter()


@router.get("", response_model=list[PytaniePublic], summary="Opublikowane pytania ROPS")
async def list_pytania(
    service: PytanieServiceDep,
    q: Annotated[str | None, Query(max_length=200)] = None,
    kategoria: Annotated[str | None, Query(max_length=100)] = None,
) -> list[PytaniePublic]:
    return await service.list_public(q, kategoria)


@router.post(
    "",
    response_model=PytanieCreated,
    status_code=status.HTTP_201_CREATED,
    summary="Pytanie do ROPS; publiczne tylko za zgodą i po odpowiedzi",
)
async def create_pytanie(data: PytanieCreate, service: PytanieServiceDep) -> PytanieCreated:
    return await service.create(data)
