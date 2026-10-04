from fastapi import APIRouter, HTTPException, status

from app.core.config import settings

router = APIRouter()


@router.post("/admin-session", summary="Token panelu dla przewodnika (tylko stack demo)")
async def admin_session() -> dict[str, str]:
    # Wyłączone domyślnie. Włączone (DEMO_TOUR_ENABLED=true) świadomie wystawia dostęp do panelu.
    if not settings.demo_tour_enabled or not settings.admin_token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    return {"token": settings.admin_token}
