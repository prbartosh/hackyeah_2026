from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import AIGatewayDep, SessionDep, TicketServiceDep
from app.models import InnovationCard
from app.repositories.card import CardRepository
from app.schemas.admin_card import (
    CardCreate,
    CardList,
    CardListItem,
    CardRead,
    CardUpdate,
    StatusKarty,
    Wdrozenie,
)
from app.schemas.innovation import Innovation
from app.services.cards import CardError, CardService, to_innovation

router = APIRouter()


def _read(card: InnovationCard, warning: str | None = None) -> CardRead:
    base = CardListItem.model_validate(card).model_dump()
    return CardRead(
        **base,
        wybrana_do_upowszechniania=card.wybrana_do_upowszechniania,
        opis=card.opis,
        problem=card.problem,
        grupa_docelowa=card.grupa_docelowa,
        kto_moze_skorzystac=card.kto_moze_skorzystac,
        czy_dziala=card.czy_dziala,
        organizacja=card.organizacja,
        licencja=card.licencja,
        url_zrodlowy=card.url_zrodlowy,
        wdrozenie=Wdrozenie(**card.wdrozenie) if card.wdrozenie else None,
        ma_embedding=bool(card.embedding),
        ostrzezenie=warning,
    )


@router.get("/karty", response_model=CardList, summary="Lista kart ze statusami")
async def list_cards(
    session: SessionDep,
    status_: Annotated[StatusKarty | None, Query(alias="status")] = None,
    q: Annotated[str | None, Query(max_length=200)] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
):
    rows, total = await CardRepository(session).list(
        status=status_, q=q, offset=offset, limit=limit
    )
    return CardList(items=[CardListItem.model_validate(r) for r in rows], total=total)


@router.post("/karty", response_model=CardRead, status_code=status.HTTP_201_CREATED)
async def create_card(data: CardCreate, session: SessionDep, ai: AIGatewayDep):
    try:
        card = await CardService(session, ai).create(data)
    except CardError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e)) from None
    return _read(card, ai.degraded)


@router.get("/karty/{slug}", response_model=CardRead)
async def get_card(slug: str, session: SessionDep):
    card = await CardRepository(session).get(slug)
    if card is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nie znaleziono karty")
    return _read(card)


@router.patch("/karty/{slug}", response_model=CardRead)
async def update_card(slug: str, data: CardUpdate, session: SessionDep, ai: AIGatewayDep):
    try:
        card = await CardService(session, ai).update(slug, data)
    except CardError as e:
        code = 404 if "Nie znaleziono" in str(e) else status.HTTP_422_UNPROCESSABLE_CONTENT
        raise HTTPException(code, str(e)) from None
    return _read(card, ai.degraded)


@router.get(
    "/karty/{slug}/podglad",
    response_model=Innovation,
    summary="Karta tak, jak zobaczy ją użytkownik",
)
async def preview_card(slug: str, session: SessionDep):
    card = await CardRepository(session).get(slug)
    if card is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nie znaleziono karty")
    return to_innovation(card)


@router.post("/reindeksuj", summary="Przelicz embeddingi kart i zgłoszeń")
async def reindex(
    session: SessionDep, ai: AIGatewayDep, tickets: TicketServiceDep
) -> dict[str, int | str | None]:
    cards = await CardService(session, ai).reindex()
    requests = await tickets.reindex()
    await session.commit()
    return {
        "karty": cards,
        "zgloszenia": requests,
        "model": ai.embedding_model,
        "ostrzezenie": ai.degraded,
    }
