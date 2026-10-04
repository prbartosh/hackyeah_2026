from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import PartnershipServiceDep
from app.schemas.partnership import (
    ContactCreate,
    OfferCreate,
    OfferCreated,
    OfferPublic,
    Powiat,
    Sektor,
    TypOgloszenia,
)

# Publiczne: ogłoszenia bez konta, widoczne po moderacji; kontakt tylko przez ROPS (ADR 0013).
router = APIRouter()


@router.get("", response_model=list[OfferPublic], summary="Opublikowane ogłoszenia partnerskie")
async def list_offers(
    service: PartnershipServiceDep,
    typ: TypOgloszenia | None = None,
    sektor: Sektor | None = None,
    powiat: Powiat | None = None,
    innowacja: Annotated[str | None, Query(max_length=200)] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[OfferPublic]:
    return await service.list_public(typ, sektor, powiat, innowacja, offset, limit)


@router.post(
    "",
    response_model=OfferCreated,
    status_code=status.HTTP_201_CREATED,
    summary="Nowe ogłoszenie; widoczne po zatwierdzeniu przez ROPS",
)
async def create_offer(data: OfferCreate, service: PartnershipServiceDep) -> OfferCreated:
    return await service.create(data)


@router.post(
    "/{offer_id}/kontakt",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Wiadomość do autora ogłoszenia przez ROPS jako pośrednika",
)
async def contact_author(
    offer_id: int, data: ContactCreate, service: PartnershipServiceDep
) -> dict[str, str]:
    await service.contact(offer_id, data)
    return {"status": "przekazane"}
