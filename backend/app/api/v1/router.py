from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    categories,
    chat,
    health,
    innovations,
    items,
    kreator,
    tickets,
)

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(items.router, prefix="/items", tags=["items"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(innovations.router, prefix="/innovations", tags=["innovations"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(tickets.router, prefix="/zgloszenia", tags=["zgloszenia"])
api_router.include_router(kreator.router, prefix="/kreator", tags=["kreator"])
