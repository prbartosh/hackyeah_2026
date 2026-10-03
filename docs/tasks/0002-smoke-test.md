# 0002. Pierwsze uruchomienie stacku

- Status: w toku
- Osoba: Bartosz (integracja)

## Cel

Cały stack wstaje w Dockerze i działa end-to-end z prawdziwym modelem. Znamy czas odpowiedzi i zużycie tokenów jednej rozmowy.

## Kroki

- [x] `docker compose up --build`
- [x] `curl localhost:8000/api/v1/health` zwraca `ok`
- [x] http://localhost:8080 ładuje stronę główną
- [x] `/innowacja/<slug>` pokazuje kartę innowacji z `GET /api/v1/innovations/{slug}`
- [ ] Czat przez proxy `/api` odpowiada strumieniem (wymaga `OPENAI_API_KEY` w `.env`). Bez klucza dziś zwraca 500, poprawka w [0008](0008-poprawki-backendu-przed-demo.md)
- [ ] Trzy scenariusze z DEMO.md (wójt, mieszkaniec, NGO) od początku do końca na prawdziwym modelu
- [ ] Pomiar z logów backendu dla jednej typowej rozmowy: czas do pierwszego zdarzenia, tokeny wejścia i wyjścia (w tym `cached`), liczba wywołań modelu. Wynik wpisać tutaj i ustawić `LLM_DAILY_TOKEN_LIMIT` w [0006](0006-limity-czatu.md)
- [ ] `docker compose exec backend pytest` przechodzi

## Notatki

- 2026-10-03: strona główna, strona innowacji i axe (WCAG 2.1 A/AA, 3 motywy) sprawdzone w Playwright, 0 naruszeń. Czat nie przetestowany: brak klucza.
