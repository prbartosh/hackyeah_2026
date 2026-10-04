from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import PartnershipServiceDep
from app.schemas.partnership import OfferAdmin, OfferAdminList, OfferStatusUpdate, StatusOgloszenia

router = APIRouter()


@router.get("/partnerstwa", response_model=OfferAdminList, summary="Ogłoszenia do moderacji")
async def list_offers(
    service: PartnershipServiceDep,
    status: StatusOgloszenia | None = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> OfferAdminList:
    return await service.list_all(status, offset, limit)


@router.patch(
    "/partnerstwa/{offer_id}", response_model=OfferAdmin, summary="Publikacja lub odrzucenie"
)
async def update_offer(
    offer_id: int, data: OfferStatusUpdate, service: PartnershipServiceDep
) -> OfferAdmin:
    return await service.set_status(offer_id, data.status)
