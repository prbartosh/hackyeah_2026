from fastapi import APIRouter, status

from app.api.deps import MentorServiceDep
from app.schemas.mentor import (
    MentorAdmin,
    MentorInput,
    MentorUpdate,
    TicketMentorAssign,
    TicketMentorRead,
)

router = APIRouter()


@router.get("/mentorzy", response_model=list[MentorAdmin], summary="Wszyscy mentorzy")
async def list_mentors(service: MentorServiceDep) -> list[MentorAdmin]:
    return await service.list_all()


@router.post(
    "/mentorzy", response_model=MentorAdmin, status_code=status.HTTP_201_CREATED,
    summary="Nowy mentor",
)  # fmt: skip
async def create_mentor(data: MentorInput, service: MentorServiceDep) -> MentorAdmin:
    return await service.create(data)


@router.patch("/mentorzy/{mentor_id}", response_model=MentorAdmin, summary="Edycja mentora")
async def update_mentor(
    mentor_id: int, data: MentorUpdate, service: MentorServiceDep
) -> MentorAdmin:
    return await service.update(mentor_id, data)


@router.get(
    "/zgloszenia/{ticket_id}/mentor", response_model=TicketMentorRead,
    summary="Mentor i prośba o mentora przy zgłoszeniu",
)  # fmt: skip
async def get_ticket_mentor(ticket_id: int, service: MentorServiceDep) -> TicketMentorRead:
    return await service.ticket_mentor(await service.get_ticket(ticket_id))


@router.patch(
    "/zgloszenia/{ticket_id}/mentor", response_model=TicketMentorRead,
    summary="Przydział mentora do zgłoszenia",
)  # fmt: skip
async def assign_mentor(
    ticket_id: int, data: TicketMentorAssign, service: MentorServiceDep
) -> TicketMentorRead:
    return await service.assign(await service.get_ticket(ticket_id), data.mentor_id)
