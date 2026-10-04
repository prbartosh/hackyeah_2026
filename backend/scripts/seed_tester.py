"""Syntetyczne dane demo dla Testera innowacji: oceny i zgłoszenia do testów.

Uruchomienie (Docker): docker compose exec backend python scripts/seed_tester.py
Opinie są wymyślone i oznaczone jako syntetyczne (bez danych osobowych). Część jest już
zatwierdzona, żeby było widać poziom „Sprawdzone”, jedna czeka na moderację w panelu.
Skrypt jest idempotentny.
"""

import asyncio
import secrets

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import Opinia, ThreadMessage, Ticket

# (slug, rodzaj, ocena, instytucja, tresc, usprawnienie, status)
OPINIE: list[tuple[str, str, int | None, str, str, str | None, str]] = [
    (
        "kody-qr-na-pomoc-seniorom",
        "ocena",
        5,
        "OPS w gminie wiejskiej (przykład)",
        "Seniorzy z kodem na opasce szybciej wracają do domu. Rodziny są spokojniejsze.",
        "Naklejki z większą czcionką i instrukcja dla sąsiadów.",
        "opublikowana",
    ),
    (
        "kody-qr-na-pomoc-seniorom",
        "ocena",
        4,
        "CUS w małym mieście (przykład)",
        "Wdrożenie zajęło miesiąc. Najtrudniej było przekonać seniorów do noszenia opaski.",
        None,
        "opublikowana",
    ),
    (
        "kody-qr-na-pomoc-seniorom",
        "ocena",
        5,
        "Stowarzyszenie seniorów (przykład)",
        "Proste i tanie. Polecamy innym klubom seniora.",
        None,
        "opublikowana",
    ),
    (
        "kody-qr-na-pomoc-seniorom",
        "test",
        None,
        "DPS w powiecie (przykład)",
        "Chcemy sprawdzić kody u 15 mieszkańców z otępieniem przez 3 miesiące.",
        "Czy kod może prowadzić do karty leków?",
        "opublikowana",
    ),
    (
        "lekki-wozek-aktywny",
        "test",
        None,
        "Szkoła podstawowa (przykład)",
        "Uczeń na wózku nie wjeżdża sam do klasy. Chcemy przetestować wózek przez semestr.",
        None,
        "opublikowana",
    ),
    (
        "lekki-wozek-aktywny",
        "ocena",
        3,
        "Fundacja (przykład)",
        "Wózek dobry, ale serwis daleko od naszej gminy.",
        "Lista punktów serwisowych.",
        "nowa",
    ),
]


async def add_threads(session) -> int:
    """Zgłoszenia do testów dostają wątek, żeby ROPS mógł przekazać im pytanie (zadanie 0039)."""
    rows = await session.scalars(
        select(Opinia).where(
            Opinia.syntetyczna.is_(True), Opinia.rodzaj == "test", Opinia.token_watku.is_(None)
        )
    )
    added = 0
    for opinia in rows:
        token = secrets.token_urlsafe(24)
        tresc = f"[Zgłoszenie do testów] {opinia.slug}\nInstytucja: {opinia.instytucja}\n\n"
        session.add(
            Ticket(tresc=tresc + opinia.tresc, syntetyczne=True, token_watku=token, status="nowe")
        )
        session.add(ThreadMessage(token_watku=token, autor_rola="uzytkownik", tresc=opinia.tresc))
        opinia.token_watku = token
        added += 1
    return added


async def main() -> None:
    async with SessionLocal() as session:
        if await session.scalar(select(Opinia.id).where(Opinia.syntetyczna.is_(True))):
            print("Opinie demo Testera już istnieją.")
        else:
            for slug, rodzaj, ocena, instytucja, tresc, usprawnienie, status in OPINIE:
                session.add(
                    Opinia(
                        slug=slug,
                        rodzaj=rodzaj,
                        ocena=ocena,
                        instytucja=instytucja,
                        tresc=tresc,
                        usprawnienie=usprawnienie,
                        status=status,
                        syntetyczna=True,
                    )
                )
            await session.flush()
            print(f"Dodano {len(OPINIE)} opinii demo.")
        threads = await add_threads(session)
        await session.commit()
        print(f"Dodano {threads} wątków zgłoszeń do testów.")


if __name__ == "__main__":
    asyncio.run(main())
