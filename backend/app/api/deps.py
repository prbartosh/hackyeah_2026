import secrets
from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import settings
from app.db.session import SessionLocal
from app.repositories.innovation import InnovationRepository
from app.services.ai import AIGateway
from app.services.chat import ChatService
from app.services.email import get_email_sender
from app.services.innovation import InnovationService
from app.services.llm import LLMService
from app.services.tickets import TicketService
from app.services.token_budget import TokenBudget


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return SessionLocal


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
def _llm_service() -> LLMService:
    return LLMService(settings, get_token_budget())


def get_llm_service() -> LLMService | None:
    """None bez klucza - SDK rzuca wtedy OpenAIError już przy tworzeniu klienta."""
    return _llm_service() if settings.llm_api_key else None


def get_chat_service(
    llm: Annotated[LLMService | None, Depends(get_llm_service)],
    innovations: Annotated[InnovationRepository, Depends(get_innovation_repository)],
    budget: Annotated[TokenBudget, Depends(get_token_budget)],
    sessions: Annotated[async_sessionmaker[AsyncSession], Depends(get_session_factory)],
) -> ChatService:
    return ChatService(llm, innovations, budget, enabled=settings.chat_enabled, sessions=sessions)


def get_innovation_service(
    repo: Annotated[InnovationRepository, Depends(get_innovation_repository)],
) -> InnovationService:
    return InnovationService(repo)


InnovationRepositoryDep = Annotated[InnovationRepository, Depends(get_innovation_repository)]
InnovationServiceDep = Annotated[InnovationService, Depends(get_innovation_service)]
ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]


def require_admin(authorization: Annotated[str | None, Header()] = None) -> None:
    """Dostęp do /admin/*: nagłówek `Authorization: Bearer <ADMIN_TOKEN>` (ADR 0006)."""
    expected = settings.admin_token
    if not expected:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Panel administratora jest wyłączony"
        )
    scheme, _, token = (authorization or "").partition(" ")
    valid = secrets.compare_digest(token.encode(), expected.encode())
    if scheme.lower() != "bearer" or not valid:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Nieprawidłowy token administratora",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_ai_gateway(session: SessionDep) -> AIGateway:
    return AIGateway(session, settings, get_llm_service())


AIGatewayDep = Annotated[AIGateway, Depends(get_ai_gateway)]


def get_ticket_service(session: SessionDep, ai: AIGatewayDep) -> TicketService:
    return TicketService(session, ai, settings, get_email_sender(settings))


TicketServiceDep = Annotated[TicketService, Depends(get_ticket_service)]
