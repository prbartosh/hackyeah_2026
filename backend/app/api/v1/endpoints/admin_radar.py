from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import AIGatewayDep, SessionDep
from app.core.config import settings
from app.models import TrendNote
from app.schemas.radar import NoteCreate, NoteRead, NoteUpdate, RadarRead
from app.services.radar import RadarService

router = APIRouter()


def _note(n: TrendNote) -> NoteRead:
    return NoteRead.model_validate(n, from_attributes=True)


@router.get("/radar", response_model=RadarRead, summary="Klastry zgłoszeń bez dopasowania")
async def get_radar(session: SessionDep, ai: AIGatewayDep):
    return await RadarService(session, ai, settings).build()


@router.get("/radar/notatki", response_model=list[NoteRead])
async def list_notes(session: SessionDep):
    rows = await session.scalars(select(TrendNote).order_by(TrendNote.id.desc()).limit(100))
    return [_note(n) for n in rows]


@router.post("/radar/notatki", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(data: NoteCreate, session: SessionDep, ai: AIGatewayDep):
    try:
        note = await RadarService(session, ai, settings).create_note(
            data.tytul, data.zgloszenia_ids
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e)) from None
    return _note(note)


@router.patch("/radar/notatki/{note_id}", response_model=NoteRead)
async def update_note(note_id: int, data: NoteUpdate, session: SessionDep):
    note = await session.get(TrendNote, note_id)
    if note is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nie znaleziono notatki")
    note.wykonana = data.wykonana
    await session.commit()
    return _note(note)
