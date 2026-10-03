# 0019. Tester innowacji (moduł IV)

- Status: review
- Osoba: Kacper
- PR: #39

## Cel

Na karcie innowacji instytucja zgłasza się do testów albo ocenia rozwiązanie (gwiazdki, feedback, propozycja usprawnienia). Pracownik ROPS zatwierdza opinie w panelu. Zatwierdzone oceny podnoszą poziom dowodu: opisane → w testach → sprawdzone. Dodatkowy moduł wyzwania (+5%). Decyzje: [ADR 0011](../adr/0011-tester-innowacji.md).

## Kroki

- [x] ADR 0011 (do przyjęcia przez zespół)
- [x] Model `Opinia`, migracja `0005`, repozytorium, serwis z poziomem dowodu
- [x] Endpointy publiczne (`/innovations/{slug}/opinie`) i admina (`/admin/opinie`)
- [x] Zgłoszenie do testów jako zgłoszenie w skrzynce, ocena jako powiadomienie
- [x] Sekcja „Oceny i testy” na stronie innowacji, formularze z walidacją przy polach
- [x] Strona moderacji w panelu (`/admin/opinie`)
- [x] Seed demo (`scripts/seed_tester.py`, też w `dev_panel.py`), testy backendu
- [x] axe: strona innowacji z formularzem i strona moderacji, 0 naruszeń
- [x] Migracja `0005` na prawdziwym PostgreSQL
- [ ] Test z czytnikiem ekranu (NVDA)
- [ ] Limit zapytań dla publicznego `POST /innovations/{slug}/opinie` (nginx)

## Notatki

- Zadanie spoza pierwotnego podziału (moduł IV nie miał właściciela). Zakres celowo cienki: bez kont, bez cyklu życia testu, bez AI.
- Seed: oceny dla „Kody QR na pomoc seniorom” (poziom „Sprawdzone”) i zgłoszenie do testów dla „Lekki wózek aktywny” (poziom „W testach”), jedna ocena czeka na moderację. Wszystko oznaczone jako dane demo.
- Na SQLite (`dev_panel.py`) godziny w panelu są przesunięte o strefę czasową, bo SQLite zapisuje czas bez strefy. Na PostgreSQL tego nie ma.
- 2026-10-03: migracje `0001`–`0005` sprawdzone na PostgreSQL 16 (obraz `postgres:16-alpine`): `upgrade head`, import 115 kart przy starcie, seedy (`seed_demo`, `seed_kreator`, `seed_tester`, ponownie bez duplikatów), 14 endpointów (opinie, moderacja, skrzynka, radar, karty, nabory, fiszka: zapis, autozapis, wysyłka, zgłoszenie) i `downgrade base` z ponownym `upgrade head`.
