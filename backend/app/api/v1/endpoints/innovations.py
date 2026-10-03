from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import InnovationRepositoryDep, InnovationServiceDep
from app.schemas.innovation import Innovation

router = APIRouter()


@router.get("", response_model=list[Innovation], summary="Lista innowacji z filtrami")
async def list_innovations(
    service: InnovationServiceDep,
    kategoria: Annotated[str | None, Query(max_length=100, description="Slug kategorii")] = None,
    q: Annotated[
        str | None,
        Query(
            max_length=200, description="Słowa z nazwy, problemu, opisu; wszystkie muszą pasować"
        ),
    ] = None,
    wybrane: Annotated[bool, Query(description="Tylko wybrane przez ROPS")] = False,
):
    return service.list(kategoria=kategoria, q=q, wybrane=wybrane)


@router.get("/{slug}", response_model=Innovation)
async def get_innovation(slug: str, repo: InnovationRepositoryDep):
    innovation = repo.get(slug)
    if innovation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Innovation not found")
    return innovation
