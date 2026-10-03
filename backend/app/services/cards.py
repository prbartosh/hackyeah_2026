"""Karty innowacji w bazie: import z JSON, edycja, embeddingi, migawka dla matchmakingu."""

import json
import logging
import re
import unicodedata
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import InnovationCard
from app.repositories.card import CardRepository
from app.repositories.innovation import (
    OVERLAY_FILE,
    OVERLAY_LISTS,
    VOCABULARY_FILE,
    _load,
    _load_overlay,
    set_db_snapshot,
)
from app.schemas.admin_card import CardCreate, CardUpdate
from app.schemas.innovation import Innovation
from app.services.ai import AIGateway
from app.services.embeddings import cosine

logger = logging.getLogger(__name__)

# Zmiana tych pól przelicza embedding.
EMBEDDED_FIELDS = (
    "nazwa",
    "problem",
    "grupa_docelowa",
    "kto_moze_skorzystac",
    "czy_dziala",
    "opis",
)
_PL = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻ", "acelnoszzACELNOSZZ")


def category_names(path: Path) -> dict[str, str]:
    file = path.parent / "kategorie.json"
    if not file.exists():
        return {}
    return {c["slug"]: c["nazwa"] for c in json.loads(file.read_text(encoding="utf-8"))}


class CardError(Exception):
    pass


def slugify(text: str) -> str:
    text = text.translate(_PL)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:80] or "karta"


def embedding_text(card: InnovationCard) -> str:
    parts = [card.nazwa, card.problem, card.grupa_docelowa, card.kto_moze_skorzystac]
    parts += [card.czy_dziala, (card.opis or "")[:1500]]
    return "\n".join(p for p in parts if p)


def to_innovation(card: InnovationCard) -> Innovation:
    """Karta tak, jak widzi ją użytkownik (matchmaking, Zasobnik, strona innowacji)."""
    return Innovation(
        slug=card.slug,
        url_zrodlowy=card.url_zrodlowy or f"/innowacja/{card.slug}",
        nazwa=card.nazwa,
        kategorie=card.kategorie or [],
        wybrana_do_upowszechniania=card.wybrana_do_upowszechniania,
        opis=card.opis,
        problem=card.problem,
        grupa_docelowa=card.grupa_docelowa,
        kto_moze_skorzystac=card.kto_moze_skorzystac,
        czy_dziala=card.czy_dziala,
        organizacja=card.organizacja,
        pdf_url=card.pdf_url,
        youtube_url=card.youtube_url,
        materialy_url=card.materialy_url,
        obraz_url=card.obraz_url,
        licencja=card.licencja,
        pobrano_dnia=card.pobrano_dnia,
    )


def overlay_of(card: InnovationCard) -> dict[str, Any] | None:
    overlay: dict[str, Any] = dict(card.nakladka or {})
    wdrozenie = {k: v for k, v in (card.wdrozenie or {}).items() if v not in (None, [], "")}
    if wdrozenie:
        overlay["wdrozenie"] = wdrozenie
    return overlay or None


class CardService:
    def __init__(self, session: AsyncSession, ai: AIGateway) -> None:
        self.session = session
        self.ai = ai
        self.repo = CardRepository(session)

    # --- migawka dla matchmakingu ---

    async def refresh_snapshot(self) -> None:
        cards = await self.repo.all()
        set_db_snapshot(
            {c.slug: (c.status == "opublikowana", to_innovation(c), overlay_of(c)) for c in cards}
        )

    # --- import z JSON ---

    async def import_from_files(self, path: Path) -> int:
        """Jednorazowo: 115 kart ROPS z plików do bazy jako opublikowane. Zwraca liczbę kart."""
        if await self.repo.count():
            return 0
        records = _load(path)
        overlays = _load_overlay(
            path.parent / OVERLAY_FILE, frozenset(records), path.parent / VOCABULARY_FILE
        )
        cards: list[InnovationCard] = []
        for slug, r in records.items():
            overlay = overlays.get(slug, {})
            cards.append(
                InnovationCard(
                    slug=slug,
                    status="opublikowana",
                    zrodlo="rops",
                    nakladka={k: overlay[k] for k in OVERLAY_LISTS if overlay.get(k)} or None,
                    wdrozenie=overlay.get("wdrozenie"),
                    **r.model_dump(exclude={"slug"}),
                )
            )
        self.session.add_all(cards)
        await self.session.flush()
        await self.reindex(cards)
        await self.session.commit()
        await self.refresh_snapshot()
        logger.info("Zaimportowano %s kart innowacji z plików", len(cards))
        return len(cards)

    # --- embeddingi ---

    async def reindex(self, cards: list[InnovationCard] | None = None) -> int:
        """Przelicza embeddingi podanych kart (domyślnie wszystkich) jednym wywołaniem."""
        cards = list(cards if cards is not None else await self.repo.all())
        if not cards:
            return 0
        vectors, model = await self.ai.embed([embedding_text(c) for c in cards])
        for card, vector in zip(cards, vectors, strict=True):
            card.embedding = vector
            card.embedding_model = model
        return len(cards)

    async def similar(
        self, vector: list[float], model: str, limit: int = 5
    ) -> list[tuple[InnovationCard, float]]:
        """Opublikowane karty najbliższe wektorowi (tylko z tym samym modelem embeddingów)."""
        scored = [
            (c, cosine(vector, c.embedding))
            for c in await self.repo.published()
            if c.embedding and c.embedding_model == model
        ]
        return sorted(scored, key=lambda x: x[1], reverse=True)[:limit]

    # --- CRUD ---

    async def create(self, data: CardCreate, *, zrodlo: str = "panel") -> InnovationCard:
        slug = await self._unique_slug(data.nazwa)
        card = InnovationCard(slug=slug, zrodlo=zrodlo, status="szkic")
        card.pobrano_dnia = datetime.now(UTC).strftime("%Y-%m-%d")
        self._apply(card, data)
        await self.repo.add(card)
        await self.reindex([card])
        await self.session.commit()
        await self.refresh_snapshot()
        return card

    async def update(self, slug: str, data: CardUpdate) -> InnovationCard:
        card = await self.repo.get(slug)
        if card is None:
            raise CardError("Nie znaleziono karty")
        changed = self._apply(card, data)
        if card.status == "opublikowana" and not (card.nazwa and card.problem):
            raise CardError("Opublikowana karta musi mieć nazwę i opis problemu")
        if changed & set(EMBEDDED_FIELDS) or not card.embedding:
            await self.reindex([card])
        await self.session.commit()
        await self.refresh_snapshot()
        return card

    def _apply(self, card: InnovationCard, data: CardUpdate) -> set[str]:
        changed: set[str] = set()
        for field, value in data.model_dump(exclude_unset=True).items():
            if field == "wdrozenie":
                value = value if value and any(v for v in value.values()) else None
            if getattr(card, field) != value:
                setattr(card, field, value)
                changed.add(field)
        return changed

    async def _unique_slug(self, name: str) -> str:
        base = slugify(name)
        slug, n = base, 2
        while await self.repo.get(slug):
            slug = f"{base}-{n}"
            n += 1
        return slug
