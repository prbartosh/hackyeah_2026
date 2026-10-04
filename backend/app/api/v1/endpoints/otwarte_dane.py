from typing import Any

from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse

from app.api.deps import OpenDataServiceDep
from app.services.otwarte_dane import DOCUMENT_COLUMNS, INNOVATION_COLUMNS, to_csv

router = APIRouter()


def _attachment(filename: str) -> dict[str, str]:
    return {"Content-Disposition": f'attachment; filename="{filename}"'}


def _csv(rows: list[dict[str, Any]], columns: list[str], filename: str) -> Response:
    return Response(
        to_csv(rows, columns), media_type="text/csv; charset=utf-8", headers=_attachment(filename)
    )


@router.get("", summary="Liczba rekordów w eksportach otwartych danych")
async def summary(service: OpenDataServiceDep) -> dict[str, int]:
    return service.summary()


@router.get("/innowacje.csv", summary="Innowacje: CSV (UTF-8 z BOM, separator `;`)")
async def innovations_csv(service: OpenDataServiceDep) -> Response:
    return _csv(service.innovation_rows(), INNOVATION_COLUMNS, "splot-innowacje.csv")


@router.get("/innowacje.json", summary="Innowacje: JSON")
async def innovations_json(service: OpenDataServiceDep) -> JSONResponse:
    return JSONResponse(service.innovation_rows(), headers=_attachment("splot-innowacje.json"))


@router.get("/dokumenty.csv", summary="Dokumenty Zasobnika (bez treści): CSV")
async def documents_csv(service: OpenDataServiceDep) -> Response:
    return _csv(service.document_rows(), DOCUMENT_COLUMNS, "splot-dokumenty.csv")


@router.get("/dokumenty.json", summary="Dokumenty Zasobnika (bez treści): JSON")
async def documents_json(service: OpenDataServiceDep) -> JSONResponse:
    return JSONResponse(service.document_rows(), headers=_attachment("splot-dokumenty.json"))
