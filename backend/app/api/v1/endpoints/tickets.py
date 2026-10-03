from fastapi import APIRouter, HTTPException, status

from app.api.deps import TicketServiceDep
from app.schemas.ticket import (
    ThreadMessageRead,
    ThreadRead,
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
    ticket, messages = found
    return ThreadRead(
        status=ticket.status,
        wiadomosci=[
            ThreadMessageRead(
                autor_rola=m.autor_rola, tresc=m.tresc, zrodla=m.zrodla, created_at=m.created_at
            )
            for m in messages
        ],
    )
