from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import KnowledgeServiceDep
from app.schemas.document import SearchResults

router = APIRouter()


@router.get(
    "",
    response_model=SearchResults,
    summary="Wspólne wyszukiwanie Zasobnika: dokumenty i karty innowacji",
)
async def search_all(
    service: KnowledgeServiceDep,
    q: Annotated[
        str,
        Query(
            min_length=2,
            max_length=200,
            description="Słowa; do dwóch muszą wystąpić wszystkie, dalej wolno pominąć jedno",
        ),
    ],
    limit: Annotated[int, Query(ge=1, le=50, description="Limit osobno dla każdej listy")] = 20,
):
    return service.search_all(q=q, limit=limit)
