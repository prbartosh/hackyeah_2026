from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import AIGatewayDep, SessionDep, TicketServiceDep
from app.core.config import settings
from app.models import Ticket
from app.schemas.ticket import (
    CardSuggestion,
    DraftUpdate,
    DuplicateRead,
    MarkRead,
    NotificationList,
    NotificationRead,
    Pilnosc,
    ReplyApprove,
    SettingsRead,
    SettingsUpdate,
    Sortowanie,
    Status,
    ThreadMessageRead,
    TicketList,
    TicketListItem,
    TicketRead,
    TicketStatusUpdate,
)
from app.services.ai import AIGateway
from app.services.app_settings import PanelSettings, save_settings
from app.services.tickets import TicketService, sla_info

router = APIRouter()


def _item(ticket: Ticket, panel: PanelSettings) -> TicketListItem:
    return TicketListItem(
        id=ticket.id,
        skrot=ticket.tresc[:140],
        status=ticket.status,
        kategoria=ticket.kategoria,
        pilnosc=ticket.pilnosc,
        created_at=ticket.created_at,
        syntetyczne=ticket.syntetyczne,
        triaz_wykonany=ticket.triaz_zrodlo is not None,
        liczba_duplikatow=len(ticket.duplikaty or []),
        sla=sla_info(ticket, panel),
    )


async def _read(service: TicketService, ticket: Ticket) -> TicketRead:
    panel = await service.panel_settings()
    messages = await service.messages(ticket)
    return TicketRead(
        **_item(ticket, panel).model_dump(),
        tresc=ticket.tresc,
        autor_nazwa=ticket.autor_nazwa,
        autor_email=ticket.autor_email,
        pilnosc_uzasadnienie=ticket.pilnosc_uzasadnienie,
        duplikaty=[DuplicateRead(**d) for d in ticket.duplikaty or []],
        proponowane_karty=[CardSuggestion(**c) for c in ticket.proponowane_karty or []],
        szkic_odpowiedzi=ticket.szkic_odpowiedzi,
        triaz_zrodlo=ticket.triaz_zrodlo,
        triaz_komunikat=ticket.triaz_komunikat,
        najlepsze_dopasowanie=ticket.najlepsze_dopasowanie,
        wiadomosci=[
            ThreadMessageRead(
                autor_rola=m.autor_rola, tresc=m.tresc, zrodla=m.zrodla, created_at=m.created_at
            )
            for m in messages
        ],
    )


async def _ticket_or_404(service: TicketService, ticket_id: int) -> Ticket:
    ticket = await service.get(ticket_id)
    if ticket is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nie znaleziono zgłoszenia")
    return ticket


@router.get("/zgloszenia", response_model=TicketList, summary="Skrzynka zgłoszeń")
async def list_tickets(
    service: TicketServiceDep,
    status_: Annotated[Status | None, Query(alias="status")] = None,
    kategoria: Annotated[str | None, Query(max_length=100)] = None,
    pilnosc: Pilnosc | None = None,
    q: Annotated[str | None, Query(max_length=200)] = None,
    sort: Sortowanie = "pilnosc",
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
):
    rows, total = await service.list_tickets(
        status=status_,
        kategoria=kategoria,
        pilnosc=pilnosc,
        q=q,
        sort=sort,
        offset=offset,
        limit=limit,
    )
    panel = await service.panel_settings()
    return TicketList(items=[_item(t, panel) for t in rows], total=total)


@router.get("/zgloszenia/{ticket_id}", response_model=TicketRead)
async def get_ticket(ticket_id: int, service: TicketServiceDep):
    return await _read(service, await _ticket_or_404(service, ticket_id))


@router.post("/zgloszenia/{ticket_id}/triaz", response_model=TicketRead)
async def run_triage(ticket_id: int, service: TicketServiceDep):
    ticket = await _ticket_or_404(service, ticket_id)
    await service.triage(ticket)
    return await _read(service, ticket)


@router.put("/zgloszenia/{ticket_id}/szkic", response_model=TicketRead)
async def save_draft(ticket_id: int, data: DraftUpdate, service: TicketServiceDep):
    ticket = await _ticket_or_404(service, ticket_id)
    await service.save_draft(ticket, data.szkic_odpowiedzi)
    return await _read(service, ticket)


@router.post("/zgloszenia/{ticket_id}/odpowiedz", response_model=TicketRead)
async def approve_reply(ticket_id: int, data: ReplyApprove, service: TicketServiceDep):
    """Jedyna droga wysłania odpowiedzi: człowiek zatwierdza (i może zmienić) tekst."""
    ticket = await _ticket_or_404(service, ticket_id)
    await service.approve_reply(ticket, data.tresc, data.zrodla)
    return await _read(service, ticket)


@router.patch("/zgloszenia/{ticket_id}/status", response_model=TicketRead)
async def set_status(ticket_id: int, data: TicketStatusUpdate, service: TicketServiceDep):
    ticket = await _ticket_or_404(service, ticket_id)
    ticket.status = data.status
    await service.session.commit()
    return await _read(service, ticket)


@router.get("/powiadomienia", response_model=NotificationList)
async def list_notifications(
    service: TicketServiceDep,
    tylko_nieprzeczytane: bool = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
):
    rows, unread = await service.notifications(only_unread=tylko_nieprzeczytane, limit=limit)
    return NotificationList(
        items=[
            NotificationRead(
                id=n.id,
                tekst=n.tekst,
                zgloszenie_id=n.zgloszenie_id,
                przeczytane=n.przeczytane,
                created_at=n.created_at,
            )
            for n in rows
        ],
        nieprzeczytane=unread,
    )


@router.post("/powiadomienia/przeczytaj")
async def mark_read(data: MarkRead, service: TicketServiceDep) -> dict[str, int]:
    return {"oznaczono": await service.mark_read(data.ids)}


async def _settings_read(service: TicketService, ai: AIGateway) -> SettingsRead:
    panel = await service.panel_settings()
    return SettingsRead(
        **panel.as_dict(),
        model_embeddingow=ai.embedding_model,
        ai_dostepne=bool(settings.openai_api_key),
    )


@router.get("/ustawienia", response_model=SettingsRead)
async def get_settings(service: TicketServiceDep, ai: AIGatewayDep):
    return await _settings_read(service, ai)


@router.put("/ustawienia", response_model=SettingsRead)
async def update_settings(
    data: SettingsUpdate, service: TicketServiceDep, ai: AIGatewayDep, session: SessionDep
):
    await save_settings(session, data.model_dump(exclude_none=True))
    return await _settings_read(service, ai)
