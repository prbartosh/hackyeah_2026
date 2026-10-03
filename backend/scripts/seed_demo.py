"""Syntetyczne zgłoszenia demo dla panelu administratora.

Uruchomienie (Docker): docker compose exec backend python scripts/seed_demo.py
Wszystkie zgłoszenia są oznaczone jako syntetyczne (pole `syntetyczne`), imiona i adresy
e-mail są wymyślone (domena example.test). Skrypt jest idempotentny.
"""

import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.api.deps import get_llm_service
from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Ticket
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


async def main() -> None:
    llm = get_llm_service() if settings.llm_api_key else None
    async with SessionLocal() as session:
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
