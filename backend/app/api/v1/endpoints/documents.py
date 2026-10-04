from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import KnowledgeServiceDep
from app.schemas.document import Document, DocumentDetail, DocumentSearchHit, DocumentType

router = APIRouter()


@router.get("", response_model=list[Document], summary="Dokumenty ROPS z filtrami (bez treści)")
async def list_documents(
    service: KnowledgeServiceDep,
    typ: Annotated[DocumentType | None, Query(description="Typ dokumentu")] = None,
    rok: Annotated[int | None, Query(ge=1900, le=2100, description="Rok wydania")] = None,
    q: Annotated[
        str | None,
        Query(max_length=200, description="Słowa z tytułu i opisu; wszystkie muszą pasować"),
    ] = None,
):
    return service.list(typ=typ, rok=rok, q=q)


@router.get(
    "/search",
    response_model=list[DocumentSearchHit],
    summary="Wyszukiwanie w treści dokumentów, z fragmentem i podświetleniem",
)
async def search_documents(
    service: KnowledgeServiceDep,
    q: Annotated[
        str,
        Query(min_length=2, max_length=200, description="Słowa; wszystkie muszą wystąpić"),
    ],
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
):
    return service.search(q=q, limit=limit)


@router.get("/{doc_id}", response_model=DocumentDetail, summary="Dokument z treścią tekstową")
async def get_document(doc_id: str, service: KnowledgeServiceDep):
    document = service.get(doc_id)
    if document is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    return document
