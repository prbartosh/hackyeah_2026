from fastapi import APIRouter

from app.api.deps import InnovationServiceDep
from app.schemas.innovation import Category

router = APIRouter()


@router.get("", response_model=list[Category], summary="Kategorie z liczbą innowacji")
async def list_categories(service: InnovationServiceDep):
    return service.categories()
