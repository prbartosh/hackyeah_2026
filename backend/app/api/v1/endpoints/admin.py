from fastapi import APIRouter, Depends

from app.api.deps import require_admin
from app.api.v1.endpoints import admin_cards, admin_imports, admin_radar, admin_tickets

# Wszystko pod /admin wymaga tokenu administratora (sprawdzane po stronie backendu).
router = APIRouter(dependencies=[Depends(require_admin)])
router.include_router(admin_cards.router)
router.include_router(admin_tickets.router)
router.include_router(admin_imports.router)
router.include_router(admin_radar.router)
