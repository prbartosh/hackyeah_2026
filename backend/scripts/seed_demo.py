"""Syntetyczne zgłoszenia demo dla panelu administratora.

Uruchomienie (Docker): docker compose exec backend python scripts/seed_demo.py
Wszystkie zgłoszenia są oznaczone jako syntetyczne (pole `syntetyczne`), imiona i adresy
e-mail są wymyślone (domena example.test). Skrypt jest idempotentny.
"""

import asyncio
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.api.deps import get_llm_service
from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Mentor, PartnershipOffer, Pytanie, Ticket
from app.schemas.ticket import TicketCreate
from app.services.ai import AIGateway
from app.services.cards import CardService
from app.services.email import get_email_sender
from app.services.tickets import TicketService

# (dni temu, treść). Bloki: dopasowane do bazy, duplikaty, grupy bez dopasowania.
DEMO_TICKETS: list[tuple[int, str]] = [
    # seniorzy i demencja (są karty w bazie)
    (3, "Mama ma początki demencji i po dziesięć razy dziennie dzwoni z pytaniem, czy brała leki."),
    (2, "Mama ma demencję, ciągle dzwoni i pyta czy brała leki i gdzie są klucze. Szukam pomocy."),
    (9, "Głuchy student musi złożyć wniosek o tłumacza PJM, formularz jest zbyt trudny."),
    (6, "Nie mogę zrobić zakupów z synem na wózku, nie ma jak posadzić go w koszyku sklepowym."),
    (20, "Szukamy sposobu na aktywizację osób w kryzysie bezdomności, które nie utrzymają etatu."),
    (11, "Do naszej szkoły trafiło dużo dzieci z Ukrainy, nauczyciele nie wiedzą jak pomagać."),
    # grupa bez dopasowania: transport seniorów na wsi (rosnąca)
    (40, "W naszej wsi nie jeździ żaden autobus, seniorzy nie mają jak dojechać do przychodni."),
    (12, "Seniorzy z sołectwa nie dojadą do lekarza, bo autobus został zlikwidowany."),
    (5, "Starsi mieszkańcy wsi nie mogą dojechać do apteki ani przychodni, brak autobusu."),
    (4, "Brak komunikacji publicznej do przychodni, starsze osoby rezygnują z wizyt lekarskich."),
    (1, "Pilne: samotna seniorka na wsi nie ma jak dojechać do lekarza, autobus nie kursuje."),
    # grupa bez dopasowania: wypalenie pracowników OPS
    (
        15,
        "Pracownicy naszego OPS są wypaleni zawodowo i przeciążeni liczbą spraw, odchodzą z pracy.",
    ),
    (8, "Wypalenie zawodowe pracowników socjalnych w gminie, brakuje superwizji i wsparcia."),
    (2, "Pracownicy socjalni są przeciążeni i wypaleni, potrzebujemy wsparcia dla zespołu OPS."),
    (7, "Młodzież w naszym mieście spędza całe dnie z telefonem, brakuje zajęć pozaszkolnych."),
    (30, "Brakuje punktu pomocy prawnej dla osób zagrożonych eksmisją w naszej dzielnicy."),
]


# Przykładowe ogłoszenia Giełdy partnerstw: (typ, sektor, powiat, tytuł, opis). Bez prawdziwych
# nazw instytucji i osób.
DEMO_OFFERS: list[tuple[str, str, str, str, str]] = [
    (
        "szukam_partnera", "publiczny", "m. Kraków",
        "Szukamy organizacji do pilotażu kodów QR dla seniorów",
        "Przykładowe ogłoszenie demo. Ośrodek pomocy społecznej chce wdrożyć rozwiązanie "
        "u 20 seniorów i szuka organizacji, która pomoże w szkoleniu opiekunów.",
    ),
    (
        "oferuje_wsparcie", "ngo", "tarnowski",
        "Wolontariusze i szkolenia z obsługi telefonu dla seniorów",
        "Przykładowe ogłoszenie demo. Organizacja pozarządowa oferuje wolontariuszy "
        "i warsztaty z prostej obsługi telefonu dla osób starszych.",
    ),
    (
        "szukam_partnera", "mieszkancy", "nowotarski",
        "Szukamy lokalu na świetlicę sąsiedzką",
        "Przykładowe ogłoszenie demo. Grupa mieszkańców szuka partnera, który udostępni "
        "salę raz w tygodniu na spotkania sąsiedzkie.",
    ),
    (
        "oferuje_wsparcie", "biznes", "m. Nowy Sącz",
        "Lokalna firma oferuje sprzęt i wsparcie IT dla projektów społecznych",
        "Przykładowe ogłoszenie demo. Firma IT oferuje używany sprzęt oraz kilka godzin "
        "pomocy technicznej miesięcznie dla organizacji realizujących wdrożenia.",
    ),
]  # fmt: skip


# Przykładowi mentorzy: (nazwa, sektor, powiat, obszary, opis). Bez prawdziwych nazwisk.
DEMO_MENTORS: list[tuple[str, str, str, list[str], str]] = [
    (
        "Mentorka przykładowa A", "ngo", "m. Kraków", ["dla-seniorow", "dla-zdrowia-i-medycyny"],
        "Przykładowy mentor demo. Wspiera pilotaże rozwiązań dla seniorów i opiekunów.",
    ),
    (
        "Mentor przykładowy B", "publiczny", "tarnowski", ["dla-rynku-pracy"],
        "Przykładowy mentor demo. Doradza przy aktywizacji zawodowej w małych gminach.",
    ),
    (
        "Mentorka przykładowa C", "nauka", "m. Kraków",
        ["dla-osob-z-niepelnosprawnoscia-sensoryczna", "dla-osob-o-ograniczonej-mobilnosci"],
        "Przykładowy mentor demo. Pomaga w badaniu potrzeb i testach z użytkownikami.",
    ),
    (
        "Mentor przykładowy D", "biznes", "nowosądecki", ["dla-osob-w-kryzysie-bezdomnosci"],
        "Przykładowy mentor demo. Łączy organizacje z lokalnym biznesem i finansowaniem.",
    ),
    (
        "Mentorka przykładowa E", "ngo", "m. Nowy Sącz",
        ["dla-dzieci-mlodziezy-i-rodziny", "dla-cudzoziemcow"],
        "Przykładowy mentor demo. Doświadczenie w pracy z rodzinami i cudzoziemcami.",
    ),
]  # fmt: skip


async def seed_mentors(session) -> None:
    if await session.scalar(select(Mentor.id).where(Mentor.syntetyczny.is_(True))):
        print("Mentorzy demo już istnieją, pomijam.")
        return
    for nazwa, sektor, powiat, obszary, opis in DEMO_MENTORS:
        session.add(
            Mentor(
                nazwa=nazwa,
                instytucja="Instytucja przykładowa (demo)",
                sektor=sektor,
                obszary=obszary,
                powiat=powiat,
                opis=opis,
                email="mentor-demo@example.test",
                aktywny=True,
                token_mentora=secrets.token_urlsafe(24),
                syntetyczny=True,
            )
        )
    await session.commit()
    print(f"Dodano {len(DEMO_MENTORS)} mentorów demo (przykładowych).")


async def seed_offers(session) -> None:
    if await session.scalar(
        select(PartnershipOffer.id).where(PartnershipOffer.syntetyczne.is_(True))
    ):
        print("Ogłoszenia partnerskie demo już istnieją, pomijam.")
        return
    for typ, sektor, powiat, tytul, opis in DEMO_OFFERS:
        session.add(
            PartnershipOffer(
                typ=typ,
                sektor=sektor,
                instytucja="Instytucja przykładowa (demo)",
                tytul=tytul,
                opis=opis,
                powiat=powiat,
                kontakt_email="demo@example.test",
                status="opublikowane",
                syntetyczne=True,
            )
        )
    await session.commit()
    print(f"Dodano {len(DEMO_OFFERS)} ogłoszeń partnerskich demo (przykładowych).")


# Przykładowe pytania i odpowiedzi (FAQ) o tym, co faktycznie robi Splot: (pytanie, odpowiedź).
DEMO_QUESTIONS: list[tuple[str, str]] = [
    (
        "Jak działa dopasowanie innowacji do mojego problemu?",
        "Na stronie głównej opisujesz problem w rozmowie. Splot ustala, kim jesteś, zadaje "
        "najwyżej kilka pytań doprecyzowujących, pokazuje podsumowanie do potwierdzenia i "
        "zwraca do 5 innowacji z wyjaśnieniem, jak każda odnosi się do Twojej sprawy. Gdy nic "
        "dobrze nie pasuje, mówi o tym wprost.",
    ),
    (
        "Czym jest Biblioteka Innowacji Społecznych?",
        "To zbiór 115 innowacji społecznych opisanych przez ROPS Kraków, podzielony na 9 "
        "kategorii. Splot dopasowuje problemy tylko do tych rozwiązań, a przy każdej innowacji "
        "pokazuje link do strony źródłowej ROPS. Całość znajdziesz w Zasobniku wiedzy.",
    ),
    (
        "Jak zgłosić potrzebę do ROPS?",
        "Wejdź na stronę „Zgłoś potrzebę” (link w stopce) i opisz sprawę. Podanie e-maila jest "
        "dobrowolne, ale dzięki niemu dostaniesz informację o odpowiedzi. Po wysłaniu "
        "dostajesz link do wątku, pod którym zobaczysz odpowiedź pracownika ROPS. Zgłoszenie "
        "jest prywatne.",
    ),
    (
        "Jak wziąć udział w testach innowacji?",
        "Na stronie wybranej innowacji znajdziesz sekcję „Oceny i testy” z przyciskiem „Chcę "
        "przetestować”. Zgłoszenie trafia do pracownika ROPS jak zwykła sprawa, a Ty dostajesz "
        "link do wątku. Możesz też ocenić rozwiązanie i opisać, co warto poprawić; opinie są "
        "publikowane po sprawdzeniu przez ROPS.",
    ),
    (
        "Czy w Kreatorze pomysłów znajdę informacje o naborach grantowych?",
        "Tak. Po wysłaniu pomysłu (lub z karty innowacji) wybierz „Znajdź finansowanie”: Kreator "
        "pokazuje aktywne nabory z uzasadnieniem i pomaga przygotować szkic wniosku. Nabory "
        "wpisuje pracownik ROPS w panelu. Szkic wniosku wymaga sprawdzenia przez Ciebie.",
    ),
    (
        "Czy mogę szukać partnera do wdrożenia innowacji?",
        "Tak, służy do tego Giełda partnerstw. Możesz dodać ogłoszenie „szukam partnera” albo "
        "„oferuję wsparcie”. Ogłoszenia sprawdza ROPS przed publikacją, a kontakt odbywa się "
        "przez ROPS, więc adresy e-mail nie są ujawniane.",
    ),
    (
        "Czy muszę mieć konto, żeby korzystać ze Splotu?",
        "Nie. Rozmowa, przeglądanie innowacji i zgłoszenia działają bez konta. Zgłoszenia "
        "odbierasz pod osobnym linkiem do wątku, a szkice w Kreatorze pomysłów wracają z "
        "adresu szkicu, więc zachowaj te linki.",
    ),
]


async def seed_questions(session) -> None:
    if await session.scalar(select(Pytanie.id).where(Pytanie.syntetyczne.is_(True))):
        print("Pytania demo już istnieją, pomijam.")
        return
    now = datetime.now(UTC)
    for index, (tresc, odpowiedz) in enumerate(DEMO_QUESTIONS):
        session.add(
            Pytanie(
                tresc=tresc,
                odpowiedz=f"Przykładowa odpowiedź demo. {odpowiedz}",
                odpowiedziano=now - timedelta(days=index + 1),
                zgoda_na_publikacje=True,
                status="opublikowane",
                syntetyczne=True,
            )
        )
    await session.commit()
    print(f"Dodano {len(DEMO_QUESTIONS)} pytań demo (przykładowych).")


async def main() -> None:
    llm = get_llm_service() if settings.llm_api_key else None
    async with SessionLocal() as session:
        await seed_offers(session)
        await seed_mentors(session)
        await seed_questions(session)
        existing = await session.scalar(select(Ticket.id).where(Ticket.syntetyczne.is_(True)))
        if existing:
            print("Zgłoszenia demo już istnieją, nic nie robię.")
            return
        ai = AIGateway(settings, llm)
        # Karty z plików muszą być w bazie, żeby triaż miał z czego dopasowywać.
        cards = CardService(session)
        await cards.import_from_files(settings.innovations_path)
        await cards.refresh_snapshot()
        service = TicketService(session, ai, settings, get_email_sender(settings))
        now = datetime.now(UTC)
        tickets = []
        for index, (days_ago, text) in enumerate(DEMO_TICKETS, start=1):
            ticket = await service.create(
                TicketCreate(
                    tresc=text,
                    autor_nazwa=f"Użytkownik demo {index}",
                    autor_email=f"demo{index}@example.test",
                ),
                synthetic=True,
            )
            ticket.created_at = now - timedelta(days=days_ago, hours=index)
            tickets.append(ticket)
        await session.commit()
        for ticket in tickets:
            await service.triage(ticket)
        # jedno zgłoszenie już odpowiedziane, żeby pokazać wątek
        answered = tickets[2]
        await service.approve_reply(
            answered,
            "Dzień dobry, to jest przykładowa odpowiedź demo. Dane są syntetyczne.",
            [p["slug"] for p in (answered.proponowane_karty or []) if p["uzyta"]][:1],
        )
        answered.odpowiedziano = answered.created_at + timedelta(hours=20)
        await session.commit()
        print(f"Dodano {len(tickets)} zgłoszeń demo (syntetycznych).")
        if ai.degraded:
            print("Uwaga:", ai.degraded)


if __name__ == "__main__":
    asyncio.run(main())
