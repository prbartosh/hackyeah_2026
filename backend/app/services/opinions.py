from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification, Opinia
from app.repositories.innovation import InnovationRepository
from app.repositories.opinion import OpiniaRepository
from app.schemas.opinion import (
    OpiniaAdmin,
    OpiniaCreate,
    OpiniaCreated,
    OpiniaPublic,
    OpinieAdminList,
    OpinieSummary,
    Poziom,
)
from app.schemas.ticket import TicketCreate
from app.services.errors import KreatorError
from app.services.tickets import TicketService

# Próg „sprawdzone przez użytkowników” (ADR 0011): co najmniej 3 zatwierdzone oceny, średnia od 4.
SPRAWDZONE_MIN_OCEN = 3
SPRAWDZONE_MIN_SREDNIA = 4.0
TICKET_LIMIT = 4000

POZIOMY = {
    "opisane": Poziom(
        kod="opisane",
        etykieta="Opisane",
        opis="Rozwiązanie jest opisane w Bibliotece Innowacji ROPS. "
        "Nikt jeszcze go u nas nie ocenił.",
    ),
    "pilotaz": Poziom(
        kod="pilotaz",
        etykieta="W testach",
        opis="Instytucje zgłosiły się do testów albo wystawiły pierwsze oceny.",
    ),
    "sprawdzone": Poziom(
        kod="sprawdzone",
        etykieta="Sprawdzone przez użytkowników",
        opis=f"Co najmniej {SPRAWDZONE_MIN_OCEN} oceny zatwierdzone przez ROPS, średnio "
        f"{SPRAWDZONE_MIN_SREDNIA:.0f} lub więcej na 5.",
    ),
}


def evidence_level(ratings: list[int], tests: int) -> Poziom:
    """Poziom dowodu z testów: opisane → w testach → sprawdzone (tylko zatwierdzone opinie)."""
    if (
        len(ratings) >= SPRAWDZONE_MIN_OCEN
        and sum(ratings) / len(ratings) >= SPRAWDZONE_MIN_SREDNIA
    ):
        return POZIOMY["sprawdzone"]
    if ratings or tests:
        return POZIOMY["pilotaz"]
    return POZIOMY["opisane"]


class OpinionService:
    def __init__(
        self, session: AsyncSession, innovations: InnovationRepository, tickets: TicketService
    ) -> None:
        self.session = session
        self.repo = OpiniaRepository(session)
        self.innovations = innovations
        self.tickets = tickets

    def _nazwa(self, slug: str) -> str:
        innovation = self.innovations.get(slug)
        if innovation is None:
            raise KreatorError("Nie znaleziono rozwiązania.", 404)
        return innovation.nazwa

    async def summary(self, slug: str) -> OpinieSummary:
        self._nazwa(slug)
        rows = await self.repo.published(slug)
        ratings = [o.ocena for o in rows if o.rodzaj == "ocena" and o.ocena]
        tests = sum(1 for o in rows if o.rodzaj == "test")
        return OpinieSummary(
            slug=slug,
            liczba_ocen=len(ratings),
            srednia=round(sum(ratings) / len(ratings), 1) if ratings else None,
            liczba_testow=tests,
            poziom=evidence_level(ratings, tests),
            opinie=[OpiniaPublic.model_validate(o, from_attributes=True) for o in rows],
        )

    def _ticket_text(self, nazwa: str, slug: str, data: OpiniaCreate) -> str:
        lines = [
            f"[Zgłoszenie do testów] {nazwa}",
            f"Innowacja: {slug}",
            f"Instytucja: {data.instytucja or 'nie podano'}",
            "",
            f"Dlaczego chcemy przetestować: {data.tresc.strip()}",
        ]
        if data.usprawnienie:
            lines.append(f"Co chcemy zmienić lub sprawdzić: {data.usprawnienie.strip()}")
        return "\n".join(lines)[:TICKET_LIMIT]

    async def create(self, slug: str, data: OpiniaCreate) -> OpiniaCreated:
        """Nowa opinia czeka na zatwierdzenie. Zgłoszenie do testów otwiera też wątek w skrzynce."""
        nazwa = self._nazwa(slug)
        opinia = await self.repo.add(
            Opinia(
                slug=slug,
                rodzaj=data.rodzaj,
                status="nowa",
                ocena=data.ocena if data.rodzaj == "ocena" else None,
                instytucja=(data.instytucja or "").strip() or None,
                tresc=data.tresc.strip(),
                usprawnienie=(data.usprawnienie or "").strip() or None,
                syntetyczna=False,
            )
        )
        if data.rodzaj == "test":
            ticket = await self.tickets.create(
                TicketCreate(
                    tresc=self._ticket_text(nazwa, slug, data), autor_email=data.autor_email
                )
            )
            opinia.token_watku = ticket.token_watku
        else:
            self.session.add(Notification(tekst=f"Nowa ocena do zatwierdzenia: {nazwa}"[:500]))
        await self.session.commit()
        return OpiniaCreated(status="nowa", token_watku=opinia.token_watku)

    def _admin(self, opinia: Opinia) -> OpiniaAdmin:
        innovation = self.innovations.get(opinia.slug)
        return OpiniaAdmin.model_validate(
            {
                **OpiniaPublic.model_validate(opinia, from_attributes=True).model_dump(),
                "id": opinia.id,
                "slug": opinia.slug,
                "nazwa": innovation.nazwa if innovation else None,
                "status": opinia.status,
                "token_watku": opinia.token_watku,
            }
        )

    async def list_all(self, status: str | None, offset: int, limit: int) -> OpinieAdminList:
        rows, total = await self.repo.list_all(status, offset, limit)
        return OpinieAdminList(items=[self._admin(o) for o in rows], total=total)

    async def set_status(self, opinia_id: int, status: str) -> OpiniaAdmin:
        opinia = await self.repo.get(opinia_id)
        if opinia is None:
            raise KreatorError("Nie znaleziono opinii.", 404)
        opinia.status = status
        await self.session.commit()
        await self.session.refresh(opinia)
        return self._admin(opinia)
