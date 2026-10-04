"""Uzupełnienie danych demo panelu: powiadomienia, importy dokumentów, notatki radaru,
rozmowy w Giełdzie partnerstw i zróżnicowane statusy zgłoszeń.

Uruchomienie (Docker): docker compose exec backend python scripts/seed_demo_extra.py
Uruchamiaj po seed_demo.py, seed_kreator.py i seed_tester.py. Wszystko jest wymyślone
(domena example.test), bez wywołań modelu językowego. Skrypt jest idempotentny.
"""

import asyncio
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import (
    DocumentImport,
    Mentor,
    Notification,
    PartnershipConversation,
    PartnershipConversationMessage,
    PartnershipOffer,
    ThreadMessage,
    Ticket,
    TrendNote,
)

MARKER = "[demo-extra]"

IMPORTS: list[tuple[str, str, str, dict[str, tuple[object, str | None, float]]]] = [
    (
        "szkic",
        "autobus-zdrowia-opis-projektu.docx",
        "Sąsiedzki Autobus Zdrowia. Seniorzy mieszkający w małych wsiach nie mają jak dojechać "
        "do przychodni, bo nie kursuje komunikacja publiczna. Gmina uruchamia mały autobus, "
        "który dwa razy w tygodniu wozi mieszkańców do przychodni i apteki. Pilotaż w dwóch "
        "gminach objął 62 seniorów, a liczba odwołanych wizyt spadła o 40 procent.",
        {
            "nazwa": ("Sąsiedzki Autobus Zdrowia", "Sąsiedzki Autobus Zdrowia", 0.95),
            "problem": (
                "Seniorzy ze wsi nie mają jak dojechać do przychodni.",
                "nie mają jak dojechać do przychodni, bo nie kursuje komunikacja publiczna",
                0.9,
            ),
            "czy_dziala": (
                "Pilotaż w dwóch gminach: 62 seniorów, o 40% mniej odwołanych wizyt.",
                "liczba odwołanych wizyt spadła o 40 procent",
                0.85,
            ),
            "poziom_dowodu": ("pilotaz", "Pilotaż w dwóch gminach", 0.55),
        },
    ),
    (
        "zatwierdzony",
        "wsparcie-opiekunow-demencja.pdf",
        "Telefon zaufania dla opiekunów osób z demencją. Opiekunowie rodzinni dzwonią do "
        "przeszkolonych wolontariuszy, którzy podpowiadają, jak reagować na powtarzające się "
        "pytania i jak zadbać o siebie. Usługa działa od roku w trzech powiatach.",
        {
            "nazwa": (
                "Telefon zaufania dla opiekunów",
                "Telefon zaufania dla opiekunów osób z demencją",
                0.9,
            ),
            "poziom_dowodu": ("wdrozony", "Usługa działa od roku w trzech powiatach", 0.8),
        },
    ),
    (
        "odrzucony",
        "notatka-ze-spotkania.docx",
        "Notatka ze spotkania zespołu: omówiliśmy harmonogram szkoleń na jesień oraz "
        "rozliczenie delegacji. Nie ma tu opisu żadnego rozwiązania społecznego.",
        {},
    ),
]

TREND_NOTES = [
    (
        "Transport seniorów na wsi: brakuje innowacji w bazie",
        [7, 8, 9, 10, 11],
        "Pięć zgłoszeń z ostatnich tygodni dotyczy dojazdu seniorów do lekarza. W bazie nie ma "
        "karty o transporcie na wsi. Warto zebrać przykłady (autobusy sąsiedzkie, wolontariat).",
    ),
    (
        "Wypalenie pracowników OPS",
        [12, 13, 14],
        "Trzy zgłoszenia od pracowników ośrodków pomocy społecznej. Do rozważenia: karta "
        "o superwizji i wsparciu zespołów.",
    ),
]


def _ago(**kwargs: float) -> datetime:
    return datetime.now(UTC) - timedelta(**kwargs)


async def seed_threads(session) -> list[Notification]:
    """Zróżnicowane statusy zgłoszeń, wątki i przydział mentora. Zwraca powiadomienia."""
    tickets = {t.id: t for t in await session.scalars(select(Ticket).order_by(Ticket.id))}
    mentor = await session.scalar(select(Mentor).order_by(Mentor.id).offset(1))
    notes: list[Notification] = []
    # Grupy bez dopasowania w bazie (transport seniorów, wypalenie OPS, młodzież, pomoc prawna):
    # Radar trendów grupuje zgłoszenia poniżej progu dopasowania.
    for ticket_id, score in {
        7: 0.12,
        8: 0.1,
        9: 0.14,
        10: 0.11,
        11: 0.13,
        12: 0.15,
        13: 0.12,
        14: 0.1,
        15: 0.18,
        16: 0.16,
    }.items():
        if ticket_id in tickets:
            tickets[ticket_id].najlepsze_dopasowanie = score
    if 1 in tickets:
        t = tickets[1]
        t.status = "w_trakcie"
        session.add_all(
            [
                ThreadMessage(
                    token_watku=t.token_watku,
                    autor_rola="admin",
                    tresc="Dzień dobry, sprawdzamy, które z rozwiązań z bazy pasuje do Pani "
                    "sytuacji. Wrócimy z odpowiedzią do końca tygodnia. (demo)",
                ),
                ThreadMessage(
                    token_watku=t.token_watku,
                    autor_rola="uzytkownik",
                    tresc="Dziękuję, czekam. Mama jest coraz bardziej zagubiona. (demo)",
                ),
            ]
        )
        notes.append(
            Notification(
                tekst="Nowa wiadomość od autora w zgłoszeniu nr 1",
                zgloszenie_id=1,
                przeczytane=False,
                created_at=_ago(hours=3),
            )
        )
    if 4 in tickets:
        t = tickets[4]
        t.status = "odpowiedziane"
        t.odpowiedziano = _ago(days=2)
        session.add(
            ThreadMessage(
                token_watku=t.token_watku,
                autor_rola="admin",
                tresc="Dzień dobry, polecamy kartę o wózkach z funkcją siedziska w sklepach. "
                "Przykładowa odpowiedź demo.",
            )
        )
    if 5 in tickets and mentor is not None:
        t = tickets[5]
        t.status = "w_trakcie"
        t.mentor_id = mentor.id
        session.add(
            ThreadMessage(
                token_watku=t.token_watku,
                autor_rola="mentor",
                tresc="Dzień dobry, pracowałem z podobną grupą. Chętnie podpowiem, od czego "
                "zacząć rozmowę z ośrodkiem. (demo)",
            )
        )
        notes.append(
            Notification(
                tekst=f"Mentor {mentor.nazwa} odpisał w zgłoszeniu nr 5",
                zgloszenie_id=5,
                przeczytane=False,
                created_at=_ago(hours=7),
            )
        )
    if 6 in tickets:
        tickets[6].mentor_prosba = True
        notes.append(
            Notification(
                tekst="Autor prosi o mentora w zgłoszeniu nr 6",
                zgloszenie_id=6,
                przeczytane=False,
                created_at=_ago(hours=26),
            )
        )
    return notes


async def seed_partnerships(session) -> list[Notification]:
    offers = list(await session.scalars(select(PartnershipOffer).order_by(PartnershipOffer.id)))
    if not offers:
        return []
    pending = PartnershipOffer(
        typ="szukam_partnera",
        sektor="ngo",
        instytucja="Stowarzyszenie demo „Sąsiedzi”",
        tytul="Szukamy gminy do pilotażu dyżurów sąsiedzkich",
        opis="Przykładowe ogłoszenie demo. Chcemy sprawdzić dyżury sąsiedzkie dla seniorów "
        "w jednej gminie wiejskiej i szukamy partnera po stronie samorządu.",
        powiat="powiat tarnowski",
        kontakt_email="sasiedzi@example.test",
        status="oczekuje",
        syntetyczne=True,
    )
    rejected = PartnershipOffer(
        typ="oferuje_wsparcie",
        sektor="biznes",
        instytucja="Firma demo",
        tytul="Tanie szkolenia, kontakt prywatny",
        opis="Przykładowe ogłoszenie demo odrzucone przez moderację: treść reklamowa.",
        powiat="m. Kraków",
        kontakt_email="reklama@example.test",
        status="odrzucone",
        syntetyczne=True,
    )
    session.add_all([pending, rejected])
    await session.flush()
    conversations = [
        (
            offers[0],
            "Gmina demo A",
            "gmina-a@example.test",
            [
                ("nadawca", "Dzień dobry, jesteśmy zainteresowani pilotażem. Jak wygląda start?"),
                ("rops", "Przekazaliśmy Państwa wiadomość autorowi ogłoszenia."),
                ("autor", "Dziękujemy za kontakt, zapraszamy na spotkanie w przyszłym tygodniu."),
            ],
            "otwarta",
        ),
        (
            offers[1],
            "Fundacja demo B",
            "fundacja-b@example.test",
            [("nadawca", "Czy macie jeszcze wolne terminy szkoleń w listopadzie?")],
            "otwarta",
        ),
    ]
    notes = [
        Notification(
            tekst=f"Nowe ogłoszenie partnerskie do moderacji: {pending.tytul}",
            przeczytane=False,
            created_at=_ago(hours=5),
        )
    ]
    for offer, name, email, messages, status in conversations:
        conv = PartnershipConversation(
            ogloszenie_id=offer.id,
            nadawca_nazwa=name,
            nadawca_email=email,
            token_nadawcy=secrets.token_urlsafe(24),
            token_autora=secrets.token_urlsafe(24),
            status=status,
        )
        session.add(conv)
        await session.flush()
        for side, text in messages:
            session.add(PartnershipConversationMessage(rozmowa_id=conv.id, strona=side, tresc=text))
        notes.append(
            Notification(
                tekst=f"Nowa rozmowa partnerska w sprawie ogłoszenia: {offer.tytul}",
                przeczytane=False,
                created_at=_ago(hours=30),
            )
        )
    return notes


async def seed_imports(session) -> None:
    for index, (status, name, text, fields) in enumerate(IMPORTS):
        pola = {
            key: {"wartosc": value, "cytat": quote, "pewnosc": confidence}
            for key, (value, quote, confidence) in fields.items()
        }
        record = DocumentImport(
            nazwa_pliku=name,
            status=status,
            tekst=text,
            pola=pola,
            ekstrakcja_zrodlo="ai" if fields else "reczna",
            komunikat=None if fields else "Nie znaleziono pól karty. Uzupełnij je ręcznie.",
        )
        record.created_at = _ago(days=index + 1)
        session.add(record)


async def main() -> None:
    async with SessionLocal() as session:
        if await session.scalar(select(TrendNote.id).where(TrendNote.tresc.contains(MARKER))):
            print("Dane uzupełniające demo już istnieją, nic nie robię.")
            return
        notes = await seed_threads(session)
        notes += await seed_partnerships(session)
        notes += [
            Notification(
                tekst="Nowa ocena do zatwierdzenia: Kody QR na pomoc (przykład demo)",
                przeczytane=False,
                created_at=_ago(hours=12),
            ),
            Notification(
                tekst="Nowe pytanie do ROPS: Jak zgłosić własną innowację do bazy?",
                przeczytane=True,
                created_at=_ago(days=2),
            ),
            Notification(
                tekst="Nowe zgłoszenie nr 11",
                zgloszenie_id=11,
                przeczytane=True,
                created_at=_ago(days=3),
            ),
            Notification(
                tekst="Nowe zgłoszenie nr 10",
                zgloszenie_id=10,
                przeczytane=True,
                created_at=_ago(days=4),
            ),
        ]
        session.add_all(notes)
        await seed_imports(session)
        for title, ids, text in TREND_NOTES:
            session.add(
                TrendNote(
                    tytul=title,
                    tresc=f"{text}\n{MARKER}",
                    zgloszenia_ids=ids,
                    wykonana=title.startswith("Wypalenie"),
                )
            )
        await session.commit()
        print(
            f"Dodano {len(notes)} powiadomień, {len(IMPORTS)} importów, {len(TREND_NOTES)} notatek."
        )


if __name__ == "__main__":
    asyncio.run(main())
