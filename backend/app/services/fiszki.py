import secrets
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import Fiszka, InnovationCard
from app.repositories.card import CardRepository
from app.repositories.kreator import FiszkaRepository
from app.schemas.kreator import (
    POLA_FISZKI_ETYKIETY,
    FiszkaFields,
    FiszkaSend,
    KartaZrodlo,
    PodobnaInnowacja,
)
from app.schemas.ticket import TicketCreate
from app.services.ai import AIGateway
from app.services.app_settings import load_settings
from app.services.cards import CardService, category_names
from app.services.errors import KreatorError
from app.services.jev import Judge
from app.services.kreator_ai import values_of
from app.services.matching import labels, load_vocabulary, tag_text
from app.services.relevance import CANDIDATES, pick_similar
from app.services.tickets import TicketService

EDITABLE = ("opis_wlasny", "istota", "odbiorca", "etap", "obszar", "lokalizacja", "potrzeby")
REQUIRED = ("istota", "odbiorca", "etap")
MAX_SIMILAR = 3
# Tyle co minimalny opis w backendzie: krótkie „Mama mnie bije” (14 znaków) też szuka podobnych.
MIN_QUERY_CHARS = 10
SOURCE_NAME = "Biblioteka Innowacji Społecznych ROPS Kraków"
TICKET_LIMIT = 4000


class FiszkaService:
    def __init__(
        self,
        session: AsyncSession,
        ai: AIGateway,
        settings: Settings,
        tickets: TicketService,
        judge: Judge | None = None,
    ) -> None:
        self.session = session
        self.ai = ai
        self.settings = settings
        self.tickets = tickets
        self.judge = judge
        self.repo = FiszkaRepository(session)
        self.cards = CardService(session)

    def categories(self) -> dict[str, str]:
        return category_names(self.settings.innovations_path)

    async def create(self, data: FiszkaFields, *, synthetic: bool = False) -> Fiszka:
        fiszka = Fiszka(token=secrets.token_urlsafe(24), status="szkic", syntetyczna=synthetic)
        fiszka.pola_ai = []
        self._apply(fiszka, data)
        await self.repo.add(fiszka)
        await self.session.commit()
        await self.session.refresh(fiszka)
        return fiszka

    async def create_from_card(self, slug: str) -> Fiszka:
        """Fiszka z karty innowacji: użytkownik chce wdrożyć u siebie rozwiązanie znane z bazy."""
        card = await CardRepository(self.session).get(slug)
        if card is None or card.status != "opublikowana":
            raise KreatorError("Nie znaleziono rozwiązania w bazie innowacji.", 404)
        fiszka = Fiszka(
            token=secrets.token_urlsafe(24),
            status="szkic",
            syntetyczna=False,
            karta_slug=slug,
            istota=f"Wdrożenie rozwiązania „{card.nazwa}” z bazy innowacji ROPS. "
            + (card.problem or "")[:600],
            odbiorca=card.grupa_docelowa,
            etap="pomysl",
            obszar=(card.kategorie or [None])[0],
            pola_ai=[],
        )
        await self.repo.add(fiszka)
        await self.session.commit()
        await self.session.refresh(fiszka)
        return fiszka

    async def get(self, token: str) -> Fiszka:
        fiszka = await self.repo.get(token)
        if fiszka is None:
            raise KreatorError("Nie znaleziono fiszki. Sprawdź adres albo zacznij nową.", 404)
        return fiszka

    async def update(self, token: str, data: FiszkaFields) -> Fiszka:
        fiszka = await self.get(token)
        if fiszka.status == "wyslana":
            raise KreatorError("Ta fiszka została już wysłana i nie można jej zmieniać.")
        self._apply(fiszka, data)
        await self.session.commit()
        await self.session.refresh(fiszka)
        return fiszka

    def _apply(self, fiszka: Fiszka, data: FiszkaFields) -> None:
        changes = data.model_dump(exclude_unset=True)
        categories = self.categories()
        for field in EDITABLE:
            if field not in changes:
                continue
            value = changes[field]
            if isinstance(value, str):
                value = value.strip() or None
            if field == "obszar" and value is not None and value not in categories:
                raise KreatorError("Wybierz obszar z listy.", 422)
            setattr(fiszka, field, value)
        if "pola_ai" in changes:
            fiszka.pola_ai = [f for f in (changes["pola_ai"] or []) if getattr(fiszka, f)]

    def missing(self, fiszka: Fiszka) -> list[str]:
        return [POLA_FISZKI_ETYKIETY[f] for f in REQUIRED if not getattr(fiszka, f)]

    def card_source(self, fiszka: Fiszka, card: InnovationCard | None) -> KartaZrodlo | None:
        if card is None or not fiszka.karta_slug:
            return None
        return KartaZrodlo(
            slug=card.slug, nazwa=card.nazwa, url=card.url_zrodlowy or f"/innowacja/{card.slug}"
        )

    async def card_of(self, fiszka: Fiszka) -> InnovationCard | None:
        if not fiszka.karta_slug:
            return None
        return await CardRepository(self.session).get(fiszka.karta_slug)

    async def similar(self, fiszka: Fiszka) -> list[PodobnaInnowacja]:
        """Istniejące, opublikowane innowacje z bazy podobne do pomysłu (ze źródłem)."""
        query = "\n".join(
            p for p in (fiszka.istota, fiszka.odbiorca, fiszka.potrzeby, fiszka.opis_wlasny) if p
        )
        return await self.similar_to_text(query, exclude=fiszka.karta_slug)

    async def similar_to_text(
        self, text: str, *, exclude: str | None = None
    ) -> list[PodobnaInnowacja]:
        if len(text.strip()) < MIN_QUERY_CHARS:
            return []
        panel = await load_settings(self.session, self.settings)
        vocabulary = load_vocabulary(self.settings.innovations_path.parent / "slownik.json")
        found = await self.cards.rank(
            text, tag_text(text, vocabulary), labels(vocabulary), CANDIDATES + 1
        )
        picked = await pick_similar(
            text,
            [(c, m) for c, m in found if c.slug != exclude],
            self.judge,
            threshold=panel.prog_dopasowania,
            limit=MAX_SIMILAR,
            timeout=self.settings.jev_timeout_seconds,
        )
        return [
            PodobnaInnowacja(
                slug=s.card.slug,
                nazwa=s.card.nazwa,
                url=s.card.url_zrodlowy or f"/innowacja/{s.card.slug}",
                zrodlo=SOURCE_NAME,
                problem=(s.card.problem or "")[:300] or None,
                grupa_docelowa=(s.card.grupa_docelowa or "")[:200] or None,
                score=s.score,
                powody=s.powody,
            )
            for s in picked
        ]

    def ticket_text(self, fiszka: Fiszka) -> str:
        values = values_of(fiszka, self.categories())
        lines = [f"[Pomysł z Kreatora] {values['istota']}", ""]
        for key in ("odbiorca", "etap", "obszar", "lokalizacja", "potrzeby"):
            if key in values:
                lines.append(f"{POLA_FISZKI_ETYKIETY[key]}: {values[key]}")
        if fiszka.karta_slug:
            lines.append(f"Dotyczy rozwiązania z bazy: {fiszka.karta_slug}")
        return "\n".join(lines)[:TICKET_LIMIT]

    async def send(self, token: str, data: FiszkaSend) -> str:
        """Wysłanie to zwykłe zgłoszenie w skrzynce panelu (powiadomienie, triaż, wątek)."""
        fiszka = await self.get(token)
        if fiszka.status == "wyslana" and fiszka.token_watku:
            return fiszka.token_watku
        missing = self.missing(fiszka)
        if missing:
            raise KreatorError(f"Uzupełnij wymagane pola: {', '.join(missing).lower()}.", 422)
        ticket = await self.tickets.create(
            TicketCreate(
                tresc=self.ticket_text(fiszka),
                autor_nazwa=data.autor_nazwa,
                autor_email=data.autor_email,
            ),
            synthetic=fiszka.syntetyczna,
        )
        fiszka.token_watku = ticket.token_watku
        fiszka.status = "wyslana"
        await self.session.commit()
        return ticket.token_watku

    def read_dict(self, fiszka: Fiszka, card: InnovationCard | None) -> dict[str, Any]:
        return {
            "token": fiszka.token,
            "status": fiszka.status,
            "opis_wlasny": fiszka.opis_wlasny,
            "istota": fiszka.istota,
            "odbiorca": fiszka.odbiorca,
            "etap": fiszka.etap,
            "obszar": fiszka.obszar,
            "lokalizacja": fiszka.lokalizacja,
            "potrzeby": fiszka.potrzeby,
            "pola_ai": fiszka.pola_ai or [],
            "karta": self.card_source(fiszka, card),
            "token_watku": fiszka.token_watku,
            "syntetyczna": fiszka.syntetyczna,
            "updated_at": fiszka.updated_at,
        }
