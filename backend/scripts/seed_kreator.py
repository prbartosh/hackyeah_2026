"""Syntetyczne dane demo dla Kreatora pomysłów: fiszki, 2 nabory (aktywny i zakończony), canva.

Uruchomienie (Docker): docker compose exec backend python scripts/seed_kreator.py
Wszystko jest oznaczone jako syntetyczne (wymyślone przykłady, żadnych prawdziwych danych osobowych
ani prawdziwych naborów). Terminy naborów liczone od dziś, więc jeden zawsze jest aktywny.
Skrypt jest idempotentny.
"""

import asyncio
from datetime import date, timedelta

from sqlalchemy import select

from app.api.deps import get_llm_service
from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Canva, Fiszka
from app.repositories.kreator import CanvaRepository, FiszkaRepository
from app.schemas.kreator import FiszkaFields, FiszkaSend, NaborInput
from app.services.ai import AIGateway
from app.services.canvy import import_templates
from app.services.email import get_email_sender
from app.services.fiszki import FiszkaService
from app.services.nabory import NaborService
from app.services.tickets import TicketService

ORGANIZATOR = "Organizator demonstracyjny (dane syntetyczne)"

FISZKI: list[dict[str, str]] = [
    {
        "istota": "Mobilny punkt porad, który raz w tygodniu przyjeżdża do świetlic wiejskich "
        "i pomaga seniorom załatwić sprawy urzędowe i zdrowotne.",
        "odbiorca": "Samotni seniorzy z małych miejscowości",
        "etap": "test_mikroskala",
        "obszar": "dla-seniorow",
        "lokalizacja": "Gmina Przykładowo (przykład)",
        "potrzeby": "Samochód, dwóch wolontariuszy i szkolenie z pierwszej pomocy.",
    },
    {
        "istota": "Codzienna krótka rozmowa telefoniczna z wolontariuszem dla osób, które "
        "rzadko z kimś rozmawiają.",
        "odbiorca": "Osoby starsze mieszkające samotnie",
        "etap": "pomysl",
        "obszar": "dla-seniorow",
    },
    {
        "istota": "Szkolny asystent kulturowy, który tłumaczy i pomaga nowym uczniom "
        "z zagranicy odnaleźć się w klasie.",
        "odbiorca": "Uczniowie i rodzice cudzoziemcy oraz nauczyciele",
        "etap": "wdrozone_lokalnie",
        "obszar": "dla-cudzoziemcow",
        "lokalizacja": "Powiat Przykładowy (przykład)",
        "potrzeby": "Dofinansowanie etatu asystenta na kolejny rok szkolny.",
    },
    {
        "istota": "Warsztaty obsługi telefonu z czytnikiem ekranu dla osób niewidomych.",
        "odbiorca": "Osoby z niepełnosprawnością wzroku",
        "etap": "test_mikroskala",
        "obszar": "dla-osob-z-niepelnosprawnoscia-sensoryczna",
    },
]

CANVA_VALUES = {
    "problem_intensywnosc": "Utrudnia działanie: seniorzy rezygnują z załatwiania spraw.",
    "problem_czestotliwosc": "Często: kilka razy w miesiącu.",
    "problem_skala": "Duża grupa: samotni seniorzy w kilku wsiach gminy.",
    "aktorzy_wspierajacy": "Sołtysi, koła gospodyń wiejskich, lokalny ośrodek pomocy społecznej.",
    "aktorzy_utrudniajacy": "Brak środków na paliwo, niechęć do zmian u części urzędników.",
    "rozwiazanie_gotowosc": "Prototyp: przetestowany w dwóch świetlicach.",
    "koszty_stale": "Samochód, ubezpieczenie, koordynator na część etatu.",
    "odbiorcy_uzytkownik": "Samotni seniorzy bez dostępu do transportu.",
}


def nabory(today: date) -> list[NaborInput]:
    common_fields = [
        {"klucz": "opis_projektu", "etykieta": "Opis projektu", "limit": 1000,
         "wskazowka": "Na czym polega projekt i co zmieni.", "zrodla": ["istota", "etap"]},
        {"klucz": "grupa_docelowa", "etykieta": "Grupa docelowa", "limit": 400,
         "wskazowka": "Kto skorzysta z projektu.", "zrodla": ["odbiorca"]},
        {"klucz": "uzasadnienie", "etykieta": "Uzasadnienie potrzeby", "limit": 800,
         "wskazowka": "Dlaczego projekt jest potrzebny.", "zrodla": ["istota", "odbiorca"]},
        {"klucz": "miejsce", "etykieta": "Miejsce realizacji", "limit": 200,
         "wskazowka": "Gmina lub powiat.", "zrodla": ["lokalizacja"]},
        {"klucz": "potrzeby", "etykieta": "Czego potrzeba do realizacji", "limit": 600,
         "wskazowka": "Zasoby, partnerzy, wsparcie.", "zrodla": ["potrzeby"]},
        {"klucz": "budzet", "etykieta": "Budżet projektu", "limit": 500,
         "wskazowka": "Kosztorys przygotuj sam: AI nie podaje kwot.", "zrodla": []},
        {"klucz": "wskazniki", "etykieta": "Wskaźniki rezultatu", "limit": 500,
         "wskazowka": "Po czym poznasz, że projekt się udał.", "zrodla": []},
    ]
    return [
        NaborInput.model_validate({
            "nazwa": "Mikrogranty „Lokalnie razem” (dane demo)",
            "organizator": ORGANIZATOR,
            "opis": "Przykładowy aktywny nabór na małe projekty lokalne (dane wymyślone).",
            "termin_od": today - timedelta(days=14),
            "termin_do": today + timedelta(days=30),
            "obszary": ["dla-seniorow", "dla-cudzoziemcow", "dla-dzieci-mlodziezy-i-rodziny"],
            "odbiorcy": ["senior", "uczni", "rodzin"],
            "pola": common_fields,
            "kryteria": [
                {"nazwa": "Trafność", "opis": "Czy projekt odpowiada na realną potrzebę?"},
                {"nazwa": "Wykonalność", "opis": "Czy da się go zrealizować w terminie?"},
                {"nazwa": "Wpływ społeczny", "opis": "Ilu osobom realnie pomoże?"},
            ],
        }),
        NaborInput.model_validate({
            "nazwa": "Wsparcie innowacji społecznych 2026, I edycja (dane demo)",
            "organizator": ORGANIZATOR,
            "opis": "Przykładowy zakończony nabór. Dane wymyślone na potrzeby demo.",
            "termin_od": today - timedelta(days=120),
            "termin_do": today - timedelta(days=60),
            "obszary": ["dla-rynku-pracy", "dla-zdrowia-i-medycyny"],
            "odbiorcy": ["bezrobotn"],
            "pola": common_fields[:3],
            "kryteria": [{"nazwa": "Innowacyjność", "opis": "Czy rozwiązanie jest nowe?"}],
        }),
    ]


async def main() -> None:
    llm = get_llm_service() if settings.llm_api_key else None
    async with SessionLocal() as session:
        await import_templates(session)
        if await session.scalar(select(Fiszka.id).where(Fiszka.syntetyczna.is_(True))):
            print("Dane demo Kreatora już istnieją, nic nie robię.")
            return
        ai = AIGateway(settings, llm)
        tickets = TicketService(session, ai, settings, get_email_sender(settings))
        fiszki = FiszkaService(session, ai, settings, tickets)
        today = date.today()

        naborsvc = NaborService(session, settings.innovations_path)
        if not await naborsvc.repo.count():
            for data in nabory(today):
                await naborsvc.create(data, today, synthetic=True)

        created = [await fiszki.create(FiszkaFields(**f), synthetic=True) for f in FISZKI]
        # Jedna fiszka jest już wysłana: widać ścieżkę odpowiedzi
        await fiszki.send(created[2].token, FiszkaSend())

        first = await FiszkaRepository(session).get(created[0].token)
        template = await CanvaRepository(session).template("innowacji-spolecznych")
        if first and template:
            canva = Canva(
                token="demo-canva-przyklad",
                szablon_slug=template.slug,
                tytul="Mobilny punkt porad (demo)",
                fiszka_id=first.id, wartosci=CANVA_VALUES, syntetyczna=True,
            )
            session.add(canva)
            await session.commit()
        print("Fiszki demo (szkice):")
        for f in created[:2] + created[3:]:
            print(f"  /kreator/fiszka/{f.token}")
        print("Canva demo: /kreator/canva/demo-canva-przyklad")


if __name__ == "__main__":
    asyncio.run(main())
