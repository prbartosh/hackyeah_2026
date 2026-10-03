from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import SessionLocal
from app.repositories.innovation import InnovationRepository
from app.services.chat import ChatService
from app.services.innovation import InnovationService
from app.services.llm import LLMService
from app.services.token_budget import TokenBudget


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_innovation_repository() -> InnovationRepository:
    return InnovationRepository(settings.innovations_path)


@lru_cache
def get_token_budget() -> TokenBudget:
    return TokenBudget(settings.llm_daily_token_limit)


@lru_cache
def get_llm_service() -> LLMService:
    return LLMService(settings, get_token_budget())


def get_chat_service(
    llm: Annotated[LLMService, Depends(get_llm_service)],
    innovations: Annotated[InnovationRepository, Depends(get_innovation_repository)],
    budget: Annotated[TokenBudget, Depends(get_token_budget)],
) -> ChatService:
    return ChatService(llm, innovations, budget, enabled=settings.chat_enabled)


def get_innovation_service(
    repo: Annotated[InnovationRepository, Depends(get_innovation_repository)],
) -> InnovationService:
    return InnovationService(repo)


InnovationRepositoryDep = Annotated[InnovationRepository, Depends(get_innovation_repository)]
InnovationServiceDep = Annotated[InnovationService, Depends(get_innovation_service)]
ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
