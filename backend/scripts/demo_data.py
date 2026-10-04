"""Dane demo w repo: eksport z bazy do JSON i wczytanie do pustej bazy.

Wczytanie (uruchamia je docker-compose po migracjach, gdy DEMO_DATA=true):
    python scripts/demo_data.py load
Eksport aktualnego stanu bazy do scripts/demo-data.json (po zmianie danych demo):
    python scripts/demo_data.py export

Wszystkie dane są wymyślone (domena example.test). Daty i godziny są zapisane razem z momentem
eksportu i przy wczytaniu przesuwane do „teraz”, więc powiadomienia i terminy naborów są
zawsze świeże. Wczytanie jest idempotentne: gdy w bazie są już zgłoszenia, nic nie robi.
"""

import asyncio
import json
import sys
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from sqlalchemy import Date, DateTime, func, select, text
from sqlalchemy.dialects.postgresql import insert

import app.models  # noqa: F401
from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal

FIXTURE = Path(__file__).with_name("demo-data.json")

# Kolejność zgodna z kluczami obcymi. Karty innowacji ładują się z plików, nie stąd.
TABLES = [
    "mentorzy",
    "zgloszenia",
    "wiadomosci_watku",
    "powiadomienia",
    "ogloszenia_partnerskie",
    "wiadomosci_partnerskie",
    "rozmowy_partnerskie",
    "wiadomosci_rozmow",
    "opinie",
    "pytania",
    "importy_dokumentow",
    "notatki_rops",
    "nazwy_klastrow",
    "szablony_canvy",
    "nabory",
    "fiszki",
    "canvy",
    "wnioski",
]
# Wektory zgłoszeń liczy model; w repo ich nie trzymamy (duże i zależne od modelu).
SKIP_COLUMNS = {"zgloszenia": {"embedding", "embedding_model"}}


def _encode(value: object) -> object:
    if isinstance(value, datetime | date):
        return value.isoformat()
    return value


async def export_data() -> None:
    data: dict[str, list[dict]] = {}
    async with SessionLocal() as session:
        for name in TABLES:
            table = Base.metadata.tables[name]
            skip = SKIP_COLUMNS.get(name, set())
            rows = (await session.execute(select(table).order_by(*table.primary_key.columns))).all()
            data[name] = [
                {c.name: _encode(row._mapping[c.name]) for c in table.columns if c.name not in skip}
                for row in rows
            ]
    payload = {"wyeksportowano": datetime.now(UTC).isoformat(), "tabele": data}
    FIXTURE.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Zapisano {FIXTURE.name}: " + ", ".join(f"{k}={len(v)}" for k, v in data.items() if v))


def _decode(column, value: object, shift: timedelta) -> object:
    if value is None:
        return None
    if isinstance(column.type, DateTime):
        return datetime.fromisoformat(value) + shift
    if isinstance(column.type, Date):
        return date.fromisoformat(value) + timedelta(days=shift.days)
    return value


async def load_data() -> None:
    if not settings.demo_data:
        print("DEMO_DATA=false, pomijam dane demo.")
        return
    payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
    shift = datetime.now(UTC) - datetime.fromisoformat(payload["wyeksportowano"])
    async with SessionLocal() as session:
        if await session.scalar(
            select(func.count()).select_from(Base.metadata.tables["zgloszenia"])
        ):
            print("W bazie są już zgłoszenia, dane demo pomijam.")
            return
        for name in TABLES:
            rows = payload["tabele"].get(name, [])
            if not rows:
                continue
            table = Base.metadata.tables[name]
            values = [
                {key: _decode(table.c[key], val, shift) for key, val in row.items()} for row in rows
            ]
            await session.execute(insert(table).values(values).on_conflict_do_nothing())
            # Klucze podane wprost nie przesuwają sekwencji, więc kolejne zapisy by się zderzyły.
            if "id" in table.c:
                await session.execute(
                    text(
                        f"SELECT setval(pg_get_serial_sequence('{name}', 'id'), "
                        f"(SELECT COALESCE(MAX(id), 1) FROM {name}))"
                    )
                )
        await session.commit()
    print(
        "Wczytano dane demo: "
        + ", ".join(f"{k}={len(v)}" for k, v in payload["tabele"].items() if v)
    )


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command not in ("export", "load"):
        sys.exit(__doc__)
    asyncio.run(export_data() if command == "export" else load_data())
