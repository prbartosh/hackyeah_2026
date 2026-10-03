from fastapi import APIRouter, HTTPException, status

from app.api.deps import InnovationRepositoryDep
from app.schemas.innovation import Innovation

router = APIRouter()


@router.get("/{slug}", response_model=Innovation)
async def get_innovation(slug: str, repo: InnovationRepositoryDep):
    innovation = repo.get(slug)
    if innovation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Innovation not found")
    return innovation
