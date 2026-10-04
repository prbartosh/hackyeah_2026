from fastapi import APIRouter, HTTPException, status

from app.api.deps import TicketServiceDep
from app.models import ThreadMessage, Ticket
from app.schemas.ticket import (
    ThreadMessageRead,
    ThreadRead,
    ThreadReply,
    TicketCreate,
    TicketCreated,
)

# Publiczne: autor zgłoszenia nie ma konta, wraca przez token wątku.
router = APIRouter()


@router.post("", response_model=TicketCreated, status_code=status.HTTP_201_CREATED)
async def create_ticket(data: TicketCreate, service: TicketServiceDep) -> TicketCreated:
    ticket = await service.create(data)
    return TicketCreated(token_watku=ticket.token_watku)


@router.get("/watek/{token}", response_model=ThreadRead, summary="Rozmowa dla autora zgłoszenia")
async def get_thread(token: str, service: TicketServiceDep) -> ThreadRead:
    found = await service.thread(token)
    if found is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nie znaleziono rozmowy")
    return _thread_read(*found)


def _thread_read(ticket: Ticket, messages: list[ThreadMessage]) -> ThreadRead:
    return ThreadRead(
        status=ticket.status,
        wiadomosci=[
            ThreadMessageRead(
                autor_rola=m.autor_rola,
                tresc=m.tresc,
                zrodla=m.zrodla,
                created_at=m.created_at,
                podpis=m.podpis,
            )
            for m in messages
        ],
        prosba_o_eksperta=ticket.prosba_o_eksperta,
        obserwuje=ticket.obserwuje,
        ekspert=ticket.ekspert,
    )


@router.post(
    "/watek/{token}/wiadomosci",
    response_model=ThreadRead,
    status_code=status.HTTP_201_CREATED,
    summary="Odpowiedź autora w jego wątku",
)
async def reply_in_thread(token: str, data: ThreadReply, service: TicketServiceDep) -> ThreadRead:
    ticket = await service.reply_in_thread(token, data.tresc)
    if ticket is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nie znaleziono rozmowy")
    return _thread_read(ticket, await service.messages(ticket))


@router.post("/watek/{token}/ekspert", response_model=ThreadRead, summary="Prośba o eksperta")
async def request_expert(token: str, service: TicketServiceDep) -> ThreadRead:
    ticket = await service.request_expert(token)
    if ticket is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nie znaleziono rozmowy")
    return _thread_read(ticket, await service.messages(ticket))
