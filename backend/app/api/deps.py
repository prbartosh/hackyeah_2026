from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import SessionLocal
from app.repositories.innovation import InnovationRepository
from app.services.chat import ChatService
from app.services.llm import LLMService


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_innovation_repository() -> InnovationRepository:
    return InnovationRepository(settings.innovations_path)


@lru_cache
def get_llm_service() -> LLMService:
    return LLMService(settings)


def get_chat_service(
    llm: Annotated[LLMService, Depends(get_llm_service)],
    innovations: Annotated[InnovationRepository, Depends(get_innovation_repository)],
) -> ChatService:
    return ChatService(llm, innovations)


InnovationRepositoryDep = Annotated[InnovationRepository, Depends(get_innovation_repository)]
ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
