import secrets
from collections.abc import AsyncIterator
from datetime import date
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import settings
from app.db.session import SessionLocal
from app.repositories.document import DocumentRepository
from app.repositories.innovation import InnovationRepository
from app.repositories.obserwator import ObserwatorRepository
from app.services.ai import AIGateway
from app.services.asystent import AsystentService
from app.services.canvy import CanvaService
from app.services.chat import ChatService
from app.services.email import get_email_sender
from app.services.fiszki import FiszkaService
from app.services.innovation import InnovationService
from app.services.knowledge import KnowledgeService
from app.services.llm import LLMProvider, create_provider
from app.services.nabory import NaborService
from app.services.opinions import OpinionService
from app.services.otwarte_dane import OpenDataService
from app.services.partnership import PartnershipService
from app.services.plain_language import PlainLanguageService
from app.services.service_card import ServiceCardService
from app.services.tickets import TicketService
from app.services.wnioski import WniosekService


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return SessionLocal


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_innovation_repository() -> InnovationRepository:
    return InnovationRepository(settings.innovations_path)


def get_obserwator_repository() -> ObserwatorRepository:
    return ObserwatorRepository(settings.obserwator_path)


@lru_cache
def _llm_service() -> LLMProvider:
    return create_provider(settings)


def get_llm_service() -> LLMProvider | None:
    """None bez klucza - SDK rzuca wtedy OpenAIError już przy tworzeniu klienta."""
    return _llm_service() if settings.llm_api_key else None


def get_chat_service(
    llm: Annotated[LLMProvider | None, Depends(get_llm_service)],
    innovations: Annotated[InnovationRepository, Depends(get_innovation_repository)],
    sessions: Annotated[async_sessionmaker[AsyncSession], Depends(get_session_factory)],
    obserwator: Annotated[ObserwatorRepository, Depends(get_obserwator_repository)],
) -> ChatService:
    return ChatService(
        llm,
        innovations,
        enabled=settings.chat_enabled,
        sessions=sessions,
        obserwator=obserwator,
    )


def get_service_card_service(
    llm: Annotated[LLMProvider | None, Depends(get_llm_service)],
    innovations: Annotated[InnovationRepository, Depends(get_innovation_repository)],
) -> ServiceCardService:
    return ServiceCardService(llm, innovations, enabled=settings.chat_enabled)


def get_plain_language_service(
    llm: Annotated[LLMProvider | None, Depends(get_llm_service)],
    innovations: Annotated[InnovationRepository, Depends(get_innovation_repository)],
) -> PlainLanguageService:
    return PlainLanguageService(llm, innovations, enabled=settings.chat_enabled)


def get_innovation_service(
    repo: Annotated[InnovationRepository, Depends(get_innovation_repository)],
) -> InnovationService:
    return InnovationService(repo)


def get_document_repository() -> DocumentRepository:
    return DocumentRepository(settings.assets_path)


def get_knowledge_service(
    repo: Annotated[DocumentRepository, Depends(get_document_repository)],
) -> KnowledgeService:
    return KnowledgeService(repo)


def get_open_data_service(
    innovations: Annotated[InnovationRepository, Depends(get_innovation_repository)],
    documents: Annotated[DocumentRepository, Depends(get_document_repository)],
) -> OpenDataService:
    return OpenDataService(innovations, documents, settings.public_base_url)


OpenDataServiceDep = Annotated[OpenDataService, Depends(get_open_data_service)]
InnovationRepositoryDep = Annotated[InnovationRepository, Depends(get_innovation_repository)]
InnovationServiceDep = Annotated[InnovationService, Depends(get_innovation_service)]
ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
KnowledgeServiceDep = Annotated[KnowledgeService, Depends(get_knowledge_service)]
ServiceCardServiceDep = Annotated[ServiceCardService, Depends(get_service_card_service)]
PlainLanguageServiceDep = Annotated[PlainLanguageService, Depends(get_plain_language_service)]


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


def get_ai_gateway() -> AIGateway:
    return AIGateway(settings, get_llm_service())


AIGatewayDep = Annotated[AIGateway, Depends(get_ai_gateway)]


def get_ticket_service(session: SessionDep, ai: AIGatewayDep) -> TicketService:
    return TicketService(session, ai, settings, get_email_sender(settings))


TicketServiceDep = Annotated[TicketService, Depends(get_ticket_service)]


def get_opinion_service(
    session: SessionDep, innovations: InnovationRepositoryDep, tickets: TicketServiceDep
) -> OpinionService:
    return OpinionService(session, innovations, tickets)


OpinionServiceDep = Annotated[OpinionService, Depends(get_opinion_service)]


def get_partnership_service(
    session: SessionDep, innovations: InnovationRepositoryDep
) -> PartnershipService:
    return PartnershipService(session, innovations, get_email_sender(settings))


PartnershipServiceDep = Annotated[PartnershipService, Depends(get_partnership_service)]


def get_today() -> date:
    return date.today()


TodayDep = Annotated[date, Depends(get_today)]


def get_fiszka_service(
    session: SessionDep, ai: AIGatewayDep, tickets: TicketServiceDep
) -> FiszkaService:
    return FiszkaService(session, ai, settings, tickets)


FiszkaServiceDep = Annotated[FiszkaService, Depends(get_fiszka_service)]


def get_nabor_service(session: SessionDep) -> NaborService:
    return NaborService(session, settings.innovations_path)


NaborServiceDep = Annotated[NaborService, Depends(get_nabor_service)]


def get_wniosek_service(
    session: SessionDep,
    ai: AIGatewayDep,
    fiszki: FiszkaServiceDep,
    nabory: NaborServiceDep,
    tickets: TicketServiceDep,
) -> WniosekService:
    return WniosekService(session, ai, fiszki, nabory, tickets)


WniosekServiceDep = Annotated[WniosekService, Depends(get_wniosek_service)]


def get_canva_service(session: SessionDep) -> CanvaService:
    return CanvaService(session)


CanvaServiceDep = Annotated[CanvaService, Depends(get_canva_service)]


def get_asystent_service(
    session: SessionDep, ai: AIGatewayDep, fiszki: FiszkaServiceDep
) -> AsystentService:
    return AsystentService(session, ai, fiszki)


AsystentServiceDep = Annotated[AsystentService, Depends(get_asystent_service)]
