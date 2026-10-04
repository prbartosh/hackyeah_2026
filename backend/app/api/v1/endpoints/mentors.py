from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import MentorServiceDep
from app.schemas.mentor import MentorPublic, MentorReply, MentorRequested, MentorThreadRead
from app.schemas.partnership import Powiat

# Publiczne, bez konta. Lista nie zawiera e-maila ani tokenu mentora.
router = APIRouter()
# Pod /zgloszenia: autor prosi o mentora ze swojego linku do wątku.
request_router = APIRouter()
# Pod /mentor: mentor odpowiada linkiem z tokenem, tylko w przypisanym wątku.
access_router = APIRouter()


@router.get("", response_model=list[MentorPublic], summary="Aktywni mentorzy")
async def list_mentors(
    service: MentorServiceDep,
    obszar: Annotated[str | None, Query(max_length=100)] = None,
    powiat: Powiat | None = None,
) -> list[MentorPublic]:
    return await service.list_public(obszar, powiat)


@request_router.post(
    "/watek/{token}/mentor",
    response_model=MentorRequested,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Autor prosi ROPS o mentora do swojej sprawy",
)
async def request_mentor(token: str, service: MentorServiceDep) -> MentorRequested:
    await service.request_mentor(token)
    return MentorRequested()


@access_router.get(
    "/{mentor_token}/watek/{thread_token}",
    response_model=MentorThreadRead,
    summary="Wątek zgłoszenia dla przypisanego mentora",
)
async def mentor_thread(
    mentor_token: str, thread_token: str, service: MentorServiceDep
) -> MentorThreadRead:
    return await service.mentor_thread(mentor_token, thread_token)


@access_router.post(
    "/{mentor_token}/watek/{thread_token}",
    response_model=MentorThreadRead,
    status_code=status.HTTP_201_CREATED,
    summary="Odpowiedź mentora w przypisanym wątku",
)
async def mentor_reply(
    mentor_token: str, thread_token: str, data: MentorReply, service: MentorServiceDep
) -> MentorThreadRead:
    await service.mentor_reply(mentor_token, thread_token, data.tresc)
    return await service.mentor_thread(mentor_token, thread_token)
