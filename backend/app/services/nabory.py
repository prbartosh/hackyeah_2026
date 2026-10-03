import re
import unicodedata
from datetime import date
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Nabor
from app.repositories.card import CardRepository
from app.repositories.kreator import FiszkaRepository, NaborRepository
from app.schemas.kreator import (
    Dopasowanie,
    NaborDopasowany,
    NaborInput,
    NaborRead,
    NaboryRead,
    StatusNaboru,
)
from app.services.cards import category_names, slugify
from app.services.errors import KreatorError

_PL = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻ", "acelnoszzACELNOSZZ")


def _plain(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.translate(_PL)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", text.lower())


def status_of(nabor: Nabor, today: date) -> StatusNaboru:
    if nabor.termin_od > today:
        return "zaplanowany"
    return "aktywny" if nabor.termin_do >= today else "zakonczony"


def to_read(nabor: Nabor, today: date) -> NaborRead:
    return NaborRead(
        slug=nabor.slug,
        status=status_of(nabor, today),
        syntetyczny=nabor.syntetyczny,
        nazwa=nabor.nazwa,
        organizator=nabor.organizator,
        opis=nabor.opis,
        url_zrodlowy=nabor.url_zrodlowy,
        termin_od=nabor.termin_od,
        termin_do=nabor.termin_do,
        pola=nabor.pola,
        kryteria=nabor.kryteria,
        obszary=nabor.obszary,
        odbiorcy=nabor.odbiorcy,
    )


def match(
    nabor: Nabor, *, areas: list[str], audience: str | None, area_names: dict[str, str]
) -> Dopasowanie:
    """Dopasowanie naboru do pomysłu po obszarze i odbiorcy, wyjaśnione jednym zdaniem."""
    common = [a for a in areas if a in (nabor.obszary or [])]
    if common:
        name = area_names.get(common[0], common[0])
        return Dopasowanie(
            pasuje=True, powod=f"Nabór dotyczy obszaru „{name}”, tak jak Twój pomysł."
        )
    text = _plain(audience or "")
    for keyword in nabor.odbiorcy or []:
        if _plain(keyword) in text:
            return Dopasowanie(
                pasuje=True,
                powod=f"Nabór wspiera grupę „{keyword}”, o której piszesz w fiszce.",
            )
    if not nabor.obszary and not nabor.odbiorcy:
        return Dopasowanie(pasuje=True, powod="Nabór jest otwarty dla wszystkich obszarów.")
    return Dopasowanie(
        pasuje=False,
        powod="Nie widzimy wspólnego obszaru ani odbiorcy. Sprawdź warunki naboru.",
    )


class NaborService:
    def __init__(self, session: AsyncSession, innovations_path: Path) -> None:
        self.session = session
        self.repo = NaborRepository(session)
        self.area_names = category_names(innovations_path)

    async def context(
        self, fiszka_token: str | None, card_slug: str | None
    ) -> tuple[list[str], str | None]:
        """Obszary i odbiorca do dopasowania: z fiszki autora albo z karty innowacji."""
        if fiszka_token:
            fiszka = await FiszkaRepository(self.session).get(fiszka_token)
            if fiszka is not None:
                return ([fiszka.obszar] if fiszka.obszar else []), fiszka.odbiorca
        if card_slug:
            card = await CardRepository(self.session).get(card_slug)
            if card is not None:
                return list(card.kategorie or []), card.grupa_docelowa
        return [], None

    async def overview(
        self, *, areas: list[str], audience: str | None, today: date
    ) -> NaboryRead:
        active = [
            NaborDopasowany(
                nabor=to_read(n, today),
                dopasowanie=match(n, areas=areas, audience=audience, area_names=self.area_names),
            )
            for n in await self.repo.active(today)
        ]
        active.sort(key=lambda a: not a.dopasowanie.pasuje)
        upcoming = await self.repo.next_upcoming(today)
        finished = await self.repo.last_finished(today)
        return NaboryRead(
            aktywne=active,
            kolejny=to_read(upcoming, today) if upcoming else None,
            ostatni_zakonczony=to_read(finished, today) if finished else None,
        )

    async def get(self, slug: str, today: date) -> NaborRead:
        nabor = await self.repo.get(slug)
        if nabor is None:
            raise KreatorError("Nie znaleziono naboru.", 404)
        return to_read(nabor, today)

    async def get_active(self, slug: str, today: date) -> Nabor:
        nabor = await self.repo.get(slug)
        if nabor is None:
            raise KreatorError("Nie znaleziono naboru.", 404)
        if status_of(nabor, today) != "aktywny":
            raise KreatorError(self.inactive_message(nabor, today))
        return nabor

    @staticmethod
    def inactive_message(nabor: Nabor, today: date) -> str:
        if nabor.termin_od > today:
            return f"Nabór „{nabor.nazwa}” rusza dopiero {nabor.termin_od:%d.%m.%Y}."
        return f"Nabór „{nabor.nazwa}” zakończył się {nabor.termin_do:%d.%m.%Y}."

    async def list_all(self, offset: int, limit: int, today: date) -> tuple[list[NaborRead], int]:
        rows, total = await self.repo.list(offset=offset, limit=limit)
        return [to_read(n, today) for n in rows], total

    def _validate(self, data: NaborInput) -> None:
        if data.termin_do < data.termin_od:
            raise KreatorError("Termin końca naboru nie może być przed jego początkiem.", 422)
        keys = [p.klucz for p in data.pola]
        if len(set(keys)) != len(keys):
            raise KreatorError("Każde pole wniosku musi mieć inny klucz.", 422)
        unknown = [a for a in data.obszary if a not in self.area_names]
        if unknown:
            raise KreatorError("Wybierz obszary z listy.", 422)

    def _apply(self, nabor: Nabor, data: NaborInput) -> None:
        nabor.nazwa = data.nazwa.strip()
        nabor.organizator = data.organizator
        nabor.opis = data.opis
        nabor.url_zrodlowy = data.url_zrodlowy
        nabor.termin_od = data.termin_od
        nabor.termin_do = data.termin_do
        nabor.pola = [p.model_dump() for p in data.pola]
        nabor.kryteria = [k.model_dump() for k in data.kryteria]
        nabor.obszary = data.obszary
        nabor.odbiorcy = [o.strip() for o in data.odbiorcy if o.strip()]

    async def create(self, data: NaborInput, today: date, *, synthetic: bool = False) -> NaborRead:
        self._validate(data)
        base = slugify(data.nazwa)
        slug, n = base, 2
        while await self.repo.get(slug):
            slug, n = f"{base}-{n}", n + 1
        nabor = Nabor(slug=slug, syntetyczny=synthetic)
        self._apply(nabor, data)
        await self.repo.add(nabor)
        await self.session.commit()
        return to_read(nabor, today)

    async def update(self, slug: str, data: NaborInput, today: date) -> NaborRead:
        nabor = await self.repo.get(slug)
        if nabor is None:
            raise KreatorError("Nie znaleziono naboru.", 404)
        self._validate(data)
        self._apply(nabor, data)
        await self.session.commit()
        return to_read(nabor, today)
