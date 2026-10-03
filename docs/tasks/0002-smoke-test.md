# 0002. Pierwsze uruchomienie stacku

- Status: zrobione
- Osoba: Bartosz (integracja)
- PR: #33, #36

## Cel

Cały stack wstaje w Dockerze i działa end-to-end z prawdziwym modelem. Znamy czas odpowiedzi i zużycie tokenów jednej rozmowy.

## Kroki

- [x] `docker compose up --build`
- [x] `curl localhost:8000/api/v1/health` zwraca `ok`
- [x] http://localhost:8080 ładuje stronę główną
- [x] `/innowacja/<slug>` pokazuje kartę innowacji z `GET /api/v1/innovations/{slug}`
- [x] Czat przez proxy `/api` odpowiada strumieniem (z kluczem DeepSeek `LLM_API_KEY` w `.env`). Przypadek bez klucza: [0008](0008-poprawki-backendu-przed-demo.md)
- [x] Trzy scenariusze z DEMO.md (wójt, mieszkaniec, NGO) od początku do końca na prawdziwym modelu
- [x] Pomiar z logów backendu dla jednej typowej rozmowy: czas do pierwszego zdarzenia, tokeny wejścia i wyjścia (w tym `cached`), liczba wywołań modelu. Wynik w notatkach niżej
- [x] `docker compose exec backend pytest` przechodzi

## Notatki

- 2026-10-03: strona główna, strona innowacji i axe (WCAG 2.1 A/AA, 3 motywy) sprawdzone w Playwright, 0 naruszeń. Czat nie przetestowany: brak klucza.
- 2026-10-03 (OpenAI, przed [ADR 0007](../adr/0007-deepseek.md)): z kluczem czat zwracał 400: `gpt-5.6-sol` w Chat Completions nie łączy narzędzi z `reasoning_effort`. Backend przeszedł na Responses API. Test poza Dockerem (`ChatService` + prawdziwy model): pytanie po 1 wywołaniu, wyniki po 3 wywołaniach („Pokaż wyniki teraz”). Wejście ok. 33 tys. tokenów na wywołanie, z czego ok. 32,7 tys. z cache od 2. wywołania; wyjście 78-363 tokeny.
- 2026-10-03: czat, tagowanie i panel przeszły na DeepSeek (`deepseek-flash`, [ADR 0007](../adr/0007-deepseek.md)). Pomiar tokenów i czasu trzeba zrobić od nowa na DeepSeek.
- 2026-10-03: `docker compose exec backend pytest`: 97 passed, 1 skipped.
- 2026-10-03, DeepSeek, ewaluacja na 5 zgłoszeniach (`show_results_now`, bez pytań): czat działa z kluczem, ale to jeszcze nie jest pełny pomiar (brak czasu do pierwszego zdarzenia i pełnej rozmowy z pytaniami). Jedno wywołanie modelu: wejście 46-52 tys. tokenów, z czego 45-51 tys. z cache, wyjście 400-700 tokenów. Do wyników potrzebne są 3 wywołania. W 2 z 5 rozmów model zwrócił niepoprawny JSON argumentów `show_results` (`KeyError('items')`). Backend odrzucił wywołanie, model ponowił je i wyniki przyszły. Do obserwacji w [0016](0016-adaptery-llm.md).
- W tym samym przebiegu 3 rozmowy urwały się, bo w trakcie ktoś przebudował kontenery (`docker compose up`). To nie był błąd czatu.
- 2026-10-03: decyzja Bartosza: trzy scenariusze z DEMO.md oznaczone jako wykonane, bez osobnego przebiegu.
- 2026-10-03, DeepSeek, pełna rozmowa przez nginx (`/api/v1/chat`): wójt, pierwsza wiadomość o samotnych seniorach, odpowiedzi pierwszą opcją, potwierdzenie podsumowania. Strumień SSE działa przez proxy. 4 zapytania, 2 rundy pytań, rola ustalona przez model: `partner`.
  - Zapytanie 1 (`role`, `problem_update`, `question`, `done`): pierwsze zdarzenie po 5,1 s, całość 6,8 s.
  - Zapytanie 2 (`problem_update`, `question`, `done`): 2,5 s / 3,2 s.
  - Zapytanie 3 (`summary`, `done`): 2,7 s / 2,7 s.
  - Zapytanie 4 (`results`, `done`): 13,1 s / 13,1 s. Wyniki: `senior-cuder` (main), `edu-gra-hahaha`, `mobilne-centrum-pomocy-dla-osob-starszych`, `centrum-antydepresyjne`, `talerze-zdrowia` (complementary). `gmina_stats` nie wystąpiło.
  - 6 wywołań modelu (po 1 w zapytaniach 1-3, 3 w zapytaniu 4). W zapytaniu 4 model znowu zwrócił niepoprawny JSON `show_results` (`KeyError('items')`), backend odrzucił wywołanie, model ponowił.
  - Tokeny razem: wejście 292 646 (cache 238 848), wyjście 4 163, łącznie 296 809. Na wywołanie: wejście 46,2-53,7 tys., cache od 2. wywołania 45,8-52,9 tys., wyjście 243-1019.
