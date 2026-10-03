from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select

from app.api.deps import AIGatewayDep, SessionDep
from app.core.config import settings
from app.models import DocumentImport
from app.schemas.admin_import import (
    ImportApprove,
    ImportField,
    ImportList,
    ImportListItem,
    ImportRead,
    ImportUpdate,
)
from app.services.documents import DocumentError, DocumentService, is_low_confidence

router = APIRouter()

LABELS = {
    "nazwa": "Nazwa",
    "problem": "Problem, który rozwiązuje",
    "grupa_docelowa": "Odbiorcy",
    "kto_moze_skorzystac": "Kto może wdrożyć",
    "opis": "Opis rozwiązania",
    "czy_dziala": "Dowody skuteczności",
    "poziom_dowodu": "Poziom dowodu",
    "organizacja": "Organizacja",
    "sektor": "Sektor (kategoria)",
    "poziom_kosztu": "Koszt wdrożenia dla instytucji",
    "czas_startu": "Czas do uruchomienia",
    "wymagane_zasoby": "Wymagania wdrożenia",
}


def _service(session: SessionDep, ai: AIGatewayDep) -> DocumentService:
    return DocumentService(session, ai, settings.innovations_path)


def _item(r: DocumentImport) -> ImportListItem:
    return ImportListItem.model_validate(r, from_attributes=True)


def _read(r: DocumentImport) -> ImportRead:
    fields = {
        key: ImportField(
            wartosc=f.get("wartosc"),
            cytat=f.get("cytat"),
            pewnosc=f.get("pewnosc"),
            niska_pewnosc=is_low_confidence(f),
            reczne=bool(f.get("reczne")),
        )
        for key, f in r.pola.items()
    }
    return ImportRead(
        **_item(r).model_dump(),
        komunikat=r.komunikat,
        tekst=r.tekst,
        pola=fields,
        etykiety=LABELS,
    )


async def _get(session: SessionDep, import_id: int) -> DocumentImport:
    record = await session.get(DocumentImport, import_id)
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nie znaleziono importu")
    return record


@router.post("/importy", response_model=ImportRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    session: SessionDep, ai: AIGatewayDep, file: Annotated[UploadFile, File()]
):
    limit = settings.max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"Plik jest za duży (maksymalnie {settings.max_upload_mb} MB)",
        )
    try:
        record = await _service(session, ai).create_import(file.filename or "dokument", data)
    except DocumentError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e)) from None
    return _read(record)


@router.get("/importy", response_model=ImportList)
async def list_imports(
    session: SessionDep,
    status_: Annotated[str | None, Query(alias="status")] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
):
    query = select(DocumentImport)
    if status_:
        query = query.where(DocumentImport.status == status_)
    total = await session.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = await session.scalars(
        query.order_by(DocumentImport.id.desc()).offset(offset).limit(limit)
    )
    return ImportList(items=[_item(r) for r in rows], total=total)


@router.get("/importy/{import_id}", response_model=ImportRead)
async def get_import(import_id: int, session: SessionDep):
    return _read(await _get(session, import_id))


@router.patch("/importy/{import_id}", response_model=ImportRead)
async def edit_import(import_id: int, data: ImportUpdate, session: SessionDep, ai: AIGatewayDep):
    record = await _get(session, import_id)
    if record.status != "szkic":
        raise HTTPException(status.HTTP_409_CONFLICT, "Ten import jest już zamknięty")
    _service(session, ai).update_fields(record, data.pola)
    await session.commit()
    return _read(record)


@router.post("/importy/{import_id}/zatwierdz", response_model=ImportRead)
async def approve_import(
    import_id: int, data: ImportApprove, session: SessionDep, ai: AIGatewayDep
):
    record = await _get(session, import_id)
    if record.status != "szkic":
        raise HTTPException(status.HTTP_409_CONFLICT, "Ten import jest już zamknięty")
    try:
        await _service(session, ai).approve(record, data.aktualizuj_slug)
    except DocumentError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(e)) from None
    return _read(record)


@router.post("/importy/{import_id}/odrzuc", response_model=ImportRead)
async def reject_import(import_id: int, session: SessionDep):
    record = await _get(session, import_id)
    if record.status != "szkic":
        raise HTTPException(status.HTTP_409_CONFLICT, "Ten import jest już zamknięty")
    record.status = "odrzucony"
    await session.commit()
    return _read(record)
