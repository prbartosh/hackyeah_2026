from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import (
    InnovationRepositoryDep,
    InnovationServiceDep,
    OpinionServiceDep,
    PlainLanguageServiceDep,
    ServiceCardServiceDep,
)
from app.schemas.innovation import Innovation
from app.schemas.opinion import OpiniaCreate, OpiniaCreated, OpinieSummary
from app.schemas.plain_language import PlainLanguageResponse
from app.schemas.service_card import ServiceCardRequest, ServiceCardResponse
from app.services.plain_language import (
    PlainLanguageFailedError,
    PlainLanguageNotFoundError,
    PlainLanguageUnavailableError,
)
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


@router.post(
    "/{slug}/prosty-jezyk",
    response_model=PlainLanguageResponse,
    summary="Opis innowacji w prostym języku (ETR)",
)
async def create_plain_language(
    slug: str, service: PlainLanguageServiceDep
) -> PlainLanguageResponse:
    try:
        return await service.create(slug)
    except PlainLanguageNotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from None
    except PlainLanguageUnavailableError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e)) from None
    except PlainLanguageFailedError:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "Nie udało się uprościć opisu. Spróbuj ponownie.",
        ) from None


@router.get(
    "/{slug}/opinie",
    response_model=OpinieSummary,
    summary="Testy i oceny innowacji zatwierdzone przez ROPS (moduł IV)",
)
async def get_opinions(slug: str, service: OpinionServiceDep) -> OpinieSummary:
    return await service.summary(slug)


@router.post(
    "/{slug}/opinie",
    response_model=OpiniaCreated,
    status_code=status.HTTP_201_CREATED,
    summary="Zgłoszenie do testów albo ocena; widoczne po zatwierdzeniu przez ROPS",
)
async def create_opinion(
    slug: str, data: OpiniaCreate, service: OpinionServiceDep
) -> OpiniaCreated:
    return await service.create(slug, data)
