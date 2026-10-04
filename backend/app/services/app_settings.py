from dataclasses import asdict, dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import AppSetting

# Duplikaty i klastry to podobieństwo znaczenia (kosinus embeddingów, ADR 0016), dopasowanie kart
# to wynik z matching.py. Na parach z docs/zestaw-testowy.md (#29-36 to inne wersje #1-17):
# próg 0,65 łapie 4/8 duplikatów przy 1 fałszywym na 622 pary (trigramy przy 0,55: 0/8),
# 0,55 łączy 6/8 w grupę radaru.
_DEFAULTS = {"prog_duplikatow": 0.65, "prog_dopasowania": 0.30, "prog_klastra": 0.55}
KEYS = ("prog_duplikatow", "prog_dopasowania", "prog_klastra", "sla_godziny")


@dataclass
class PanelSettings:
    prog_duplikatow: float
    prog_dopasowania: float
    prog_klastra: float
    sla_godziny: float

    def as_dict(self) -> dict[str, float]:
        return asdict(self)


async def load_settings(session: AsyncSession, settings: Settings) -> PanelSettings:
    values: dict[str, float] = {**_DEFAULTS, "sla_godziny": float(settings.sla_hours)}
    for row in await session.scalars(select(AppSetting)):
        if row.klucz in KEYS:
            values[row.klucz] = row.wartosc
    return PanelSettings(**values)


async def save_settings(session: AsyncSession, changes: dict[str, float]) -> None:
    for key, value in changes.items():
        if key not in KEYS:
            continue
        row = await session.get(AppSetting, key)
        if row is None:
            session.add(AppSetting(klucz=key, wartosc=value))
        else:
            row.wartosc = value
    await session.commit()
