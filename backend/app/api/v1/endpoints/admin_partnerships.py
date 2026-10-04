from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import PartnershipServiceDep
from app.schemas.partnership import (
    ConversationAdmin,
    ConversationAdminList,
    MessageCreate,
    OfferAdmin,
    OfferAdminList,
    OfferStatusUpdate,
    StatusOgloszenia,
)

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


@router.get(
    "/partnerstwa-rozmowy", response_model=ConversationAdminList, summary="Rozmowy partnerskie"
)
async def list_conversations(
    service: PartnershipServiceDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> ConversationAdminList:
    return await service.list_conversations(offset, limit)


@router.get(
    "/partnerstwa-rozmowy/{conversation_id}",
    response_model=ConversationAdmin,
    summary="Podgląd rozmowy partnerskiej",
)
async def get_conversation(
    conversation_id: int, service: PartnershipServiceDep
) -> ConversationAdmin:
    return await service.admin_view(conversation_id)


@router.post(
    "/partnerstwa-rozmowy/{conversation_id}/zamknij",
    response_model=ConversationAdmin,
    summary="Zamknięcie rozmowy (moderacja nadużyć); dalej tylko odczyt",
)
async def close_conversation(
    conversation_id: int, service: PartnershipServiceDep
) -> ConversationAdmin:
    return await service.close(conversation_id)


@router.post(
    "/partnerstwa-rozmowy/{conversation_id}/wiadomosci",
    response_model=ConversationAdmin,
    status_code=201,
    summary="Wpis ROPS w rozmowie; obie strony dostają e-mail",
)
async def rops_message(
    conversation_id: int, data: MessageCreate, service: PartnershipServiceDep
) -> ConversationAdmin:
    return await service.rops_message(conversation_id, data)
