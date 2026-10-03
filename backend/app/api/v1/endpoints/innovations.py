from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import InnovationRepositoryDep, InnovationServiceDep, ServiceCardServiceDep
from app.schemas.innovation import Innovation
from app.schemas.service_card import ServiceCardRequest, ServiceCardResponse
from app.services.service_card import (
    ServiceCardFailedError,
    ServiceCardNotFoundError,
    ServiceCardUnavailableError,
)

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


@router.post(
    "/{slug}/service-card",
    response_model=ServiceCardResponse,
    summary="Karta usługi: jak wdrożyć innowację u siebie (moduł VII)",
)
async def create_service_card(
    slug: str, request: ServiceCardRequest, service: ServiceCardServiceDep
) -> ServiceCardResponse:
    try:
        return await service.create(slug, request)
    except ServiceCardNotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from None
    except ServiceCardUnavailableError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e)) from None
    except ServiceCardFailedError:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "Nie udało się przygotować karty. Spróbuj ponownie.",
        ) from None
