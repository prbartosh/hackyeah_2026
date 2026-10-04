import logging
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import Notification, Pytanie
from app.repositories.innovation_search import matches_query, normalize, tokens
from app.repositories.pytanie import PytanieRepository
from app.schemas.pytanie import (
    PytanieAdmin,
    PytanieAdminList,
    PytanieCreate,
    PytanieCreated,
    PytaniePublic,
)
from app.services.email import EmailSender
from app.services.errors import KreatorError

logger = logging.getLogger(__name__)


class PytanieService:
    """Pytania do ROPS: publikacja tylko za zgodą i po decyzji pracownika."""

    def __init__(self, session: AsyncSession, settings: Settings, email: EmailSender) -> None:
        self.session = session
        self.settings = settings
        self.repo = PytanieRepository(session)
        self.email = email

    async def create(self, data: PytanieCreate) -> PytanieCreated:
        pytanie = Pytanie(
            tresc=data.tresc.strip(),
            kategoria=data.kategoria,
            autor_nazwa=(data.autor_nazwa or "").strip() or None,
            autor_email=(data.autor_email or "").strip() or None,
            zgoda_na_publikacje=data.zgoda_na_publikacje,
            status="nowe",
        )
        await self.repo.add(pytanie)
        self.session.add(Notification(tekst=f"Nowe pytanie do ROPS: {pytanie.tresc}"[:500]))
        await self.session.commit()
        if self.settings.admin_notify_email:
            try:
                await self.email.send(
                    self.settings.admin_notify_email,
                    f"Nowe pytanie do ROPS nr {pytanie.id}",
                    f"{pytanie.tresc[:300]}\n\n{self.settings.public_base_url}/admin/pytania",
                )
            except Exception:  # pytanie jest już zapisane i widoczne w panelu
                logger.exception("Nie udało się powiadomić o pytaniu %s", pytanie.id)
        return PytanieCreated(id=pytanie.id, status="nowe")

    async def list_public(self, q: str | None, kategoria: str | None) -> list[PytaniePublic]:
        rows = await self.repo.published(kategoria)
        query_tokens = tokens(q or "")
        if query_tokens:
            texts = {r.id: normalize(f"{r.tresc} {r.odpowiedz}") for r in rows}
            rows = [r for r in rows if matches_query(texts[r.id], query_tokens)]
        return [PytaniePublic.model_validate(r, from_attributes=True) for r in rows]

    async def list_all(self, status: str | None, offset: int, limit: int) -> PytanieAdminList:
        rows, total = await self.repo.list(status=status, offset=offset, limit=limit)
        return PytanieAdminList(
            items=[PytanieAdmin.model_validate(r, from_attributes=True) for r in rows], total=total
        )

    async def _get(self, pytanie_id: int) -> Pytanie:
        pytanie = await self.repo.get(pytanie_id)
        if pytanie is None:
            raise KreatorError("Nie znaleziono pytania.", 404)
        return pytanie

    async def _save(self, pytanie: Pytanie) -> PytanieAdmin:
        await self.session.commit()
        await self.session.refresh(pytanie)
        return PytanieAdmin.model_validate(pytanie, from_attributes=True)

    async def answer(self, pytanie_id: int, text: str, tresc: str | None = None) -> PytanieAdmin:
        """Zapisuje odpowiedź; e-mail do pytającego idzie tylko przy pierwszej odpowiedzi.

        `tresc` pozwala poprawić pytanie przed publikacją (np. usunąć dane osobowe).
        """
        pytanie = await self._get(pytanie_id)
        if tresc is not None:
            pytanie.tresc = tresc.strip()
        first = pytanie.odpowiedziano is None
        pytanie.odpowiedz = text.strip()
        pytanie.odpowiedziano = datetime.now(UTC)
        if pytanie.status in ("nowe", "ukryte"):
            pytanie.status = "odpowiedziane"
        result = await self._save(pytanie)
        if first and pytanie.autor_email and not pytanie.syntetyczne:
            body = (
                f"Dzień dobry,\n\nodpowiedź ROPS na Twoje pytanie:\n„{pytanie.tresc}”\n\n"
                f"{pytanie.odpowiedz}\n\nPozdrawiamy, zespół ROPS"
            )
            try:
                await self.email.send(pytanie.autor_email, "Odpowiedź ROPS na Twoje pytanie", body)
            except Exception:  # odpowiedź jest już zapisana
                logger.exception("Nie udało się wysłać odpowiedzi na pytanie %s", pytanie.id)
        return result

    async def publish(self, pytanie_id: int) -> PytanieAdmin:
        pytanie = await self._get(pytanie_id)
        if not pytanie.zgoda_na_publikacje:
            raise KreatorError("Autor nie zgodził się na publikację pytania.")
        if not pytanie.odpowiedz:
            raise KreatorError("Najpierw odpowiedz na pytanie.")
        pytanie.status = "opublikowane"
        return await self._save(pytanie)

    async def hide(self, pytanie_id: int) -> PytanieAdmin:
        pytanie = await self._get(pytanie_id)
        pytanie.status = "ukryte"
        return await self._save(pytanie)
