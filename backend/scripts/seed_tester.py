"""Syntetyczne dane demo dla Testera innowacji: oceny i zgłoszenia do testów.

Uruchomienie (Docker): docker compose exec backend python scripts/seed_tester.py
Opinie są wymyślone i oznaczone jako syntetyczne (bez danych osobowych). Część jest już
zatwierdzona, żeby było widać poziom „Sprawdzone”, jedna czeka na moderację w panelu.
Skrypt jest idempotentny.
"""

import asyncio

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import Opinia

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


async def main() -> None:
    async with SessionLocal() as session:
        if await session.scalar(select(Opinia.id).where(Opinia.syntetyczna.is_(True))):
            print("Dane demo Testera już istnieją, nic nie robię.")
            return
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
        await session.commit()
        print(f"Dodano {len(OPINIE)} opinii demo.")


if __name__ == "__main__":
    asyncio.run(main())
