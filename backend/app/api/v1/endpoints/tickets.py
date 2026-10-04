from fastapi import APIRouter, HTTPException, status

from app.api.deps import TicketServiceDep
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
    ticket, messages = found
    return ThreadRead(
        status=ticket.status,
        wiadomosci=[ThreadMessageRead.model_validate(m) for m in messages],
        obserwuje=ticket.obserwuje,
    )


@router.post(
    "/watek/{token}/wiadomosci",
    response_model=ThreadMessageRead,
    status_code=status.HTTP_201_CREATED,
    summary="Autor dopisuje wiadomość do rozmowy",
)
async def reply_in_thread(
    token: str, data: ThreadReply, service: TicketServiceDep
) -> ThreadMessageRead:
    message = await service.author_reply(token, data.tresc)
    if message is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nie znaleziono rozmowy")
    return ThreadMessageRead.model_validate(message)
