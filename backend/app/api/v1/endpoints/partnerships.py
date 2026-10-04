from typing import Annotated

from fastapi import APIRouter, Path, Query, status

from app.api.deps import PartnershipServiceDep
from app.schemas.partnership import (
    ContactCreate,
    ContactCreated,
    ConversationView,
    MessageCreate,
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
    response_model=ContactCreated,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Otwiera rozmowę z autorem ogłoszenia przez ROPS jako pośrednika",
)
async def contact_author(
    offer_id: int, data: ContactCreate, service: PartnershipServiceDep
) -> ContactCreated:
    return await service.contact(offer_id, data)


@router.get(
    "/rozmowy/{token}",
    response_model=ConversationView,
    summary="Rozmowa widziana ze strony tokenu, bez adresów e-mail",
)
async def get_conversation(
    token: Annotated[str, Path(min_length=8, max_length=64)], service: PartnershipServiceDep
) -> ConversationView:
    return await service.view(token)


@router.post(
    "/rozmowy/{token}/wiadomosci",
    response_model=ConversationView,
    status_code=status.HTTP_201_CREATED,
    summary="Nowa wiadomość w rozmowie; druga strona dostaje e-mail z linkiem",
)
async def reply(
    token: Annotated[str, Path(min_length=8, max_length=64)],
    data: MessageCreate,
    service: PartnershipServiceDep,
) -> ConversationView:
    return await service.reply(token, data)
