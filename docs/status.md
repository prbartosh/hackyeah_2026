# Stan prac

Krótki przegląd. Szczegóły zadań w [tasks/](tasks/), decyzje w [adr/](adr/).

## W toku

- [0003](tasks/0003-zasobnik-wiedzy.md) Zasobnik wiedzy, moduł II (Bartłomiej, Daniel, Kacper): innowacje (backend i frontend) w [PR #9](https://github.com/prbartosh/hackyeah_2026/pull/9), dokumenty nie zaczęte, brakuje testu z czytnikiem ekranu
- [0002](tasks/0002-smoke-test.md) Pierwsze uruchomienie stacku (Bartosz): stack, strony i axe sprawdzone, scenariusze i pytest zrobione, limit 300 tys. tokenów, brakuje testu czatu przez proxy i pełnego pomiaru
- [0005](tasks/0005-slownik-i-nakladka.md) Słownik i nakładka innowacji (Bartłomiej): dane i kod są, czeka na przegląd słownika i wyrywkowy przegląd nakładki
- [0015](tasks/0015-panel-administratora.md) Panel administratora, moduł VI (Kacper, do potwierdzenia): backend, UI, seed i testy gotowe, zostaje test z czytnikiem ekranu, prawdziwy Postgres i klucz DeepSeek ([jak uruchomić](panel-administratora.md))
- [0011](tasks/0011-materialy-dla-jury.md) Materiały dla jury (Nikodem, Wiktor): szkice mapowania, scenariusza i README w `docs/jury/`, reszta po działającym demo
- [0012](tasks/0012-middleman-innowacji.md) Moduł VII Middleman innowacji (Bartosz, Kacper): ADR 0009 i backend `POST /api/v1/innovations/{slug}/service-card` gotowe, front (Kacper) do zrobienia
- [0013](tasks/0013-dane-gminy-w-czacie.md) Dane gminy z Obserwatora w czacie (Bartosz): backend z narzędziem `gmina_stats` i zdarzeniem SSE gotowy, front (Daniel, Kacper) do zrobienia, test na prawdziwym modelu

## Do zrobienia

- [0004](tasks/0004-zapis-potrzeb.md) Zapis potrzeb przy każdej odpowiedzi z wynikami (Bartłomiej)
- [0008](tasks/0008-poprawki-backendu-przed-demo.md) Poprawki backendu przed demo: błąd przy braku klucza, pole `organizacja` (Bartłomiej)
- [0016](tasks/0016-adaptery-llm.md) Port LLM i adaptery dostawców: logika czatu i panelu niezależna od dostawcy, wybór przez `LLM_PROVIDER` (Bartłomiej)
- [0017](tasks/0017-dopasowanie-deterministyczne-panel.md) Deterministyczne dopasowanie w panelu zamiast embeddingów, czeka na 5 decyzji (Kacper)

## Do zaprojektowania

- „Podobne przypadki” w matchmakingu (moduł I): osobny ADR, korzysta z zapisu potrzeb

## Zrobione

- 2026-10-03: Ewaluacja dopasowania ([0009](tasks/0009-ewaluacja-dopasowania.md)): skrypt `backend/scripts/eval_matchmaking.py`, pełny pomiar niepotrzebny (decyzja Bartosza)
- 2026-10-03: Frontend buduje się z `npm ci` na podstawie `package-lock.json` ([zadanie 0001](tasks/0001-package-lock.md))
- 2026-10-03: Pasek dostępności zwijany na mobile, axe na mobile 0 naruszeń ([zadanie 0010](tasks/0010-dostepnosc-mobile-i-glos.md))
- 2026-10-03: Licencje danych ROPS ([0014](tasks/0014-licencje-danych-rops.md)): CC BY 4.0 przy 5 z 51 raportów, reszta bez licencji na stronie, GUS z podaniem źródła; w Zasobniku licencja tylko tam, gdzie jest
- 2026-10-03: Struktura repo, Docker Compose, frontend statycznie na nginx
- 2026-10-03: Scraper Biblioteki Innowacji, 115 innowacji w `assets/innowacje-spoleczne/` ([baza-innowacji.md](baza-innowacji.md))
- 2026-10-03: Scrapery raportów, publikacji, Mapy Wyzwań i Obserwatora Statystyk w `assets/`
- 2026-10-03: Obiekt innowacji, nakładka i słownik ([ADR 0004](adr/0004-obiekt-innowacji.md))
- 2026-10-03: Backend rozmowy matchmakingu: `POST /api/v1/chat` (SSE), `GET /api/v1/innovations/{slug}` ([ADR 0005](adr/0005-matchmaking-chat-llm.md))
- 2026-10-03: Mockup frontendu, strona innowacji `/innowacja/:slug`
- 2026-10-03: Ustalenia otwarte ([0007](tasks/0007-ustalenia-otwarte.md)): obszary zespołu, zakres demo, limity, retencja, [zestaw testowy](zestaw-testowy.md)
- 2026-10-03: Kryteria oceny ([kryteria-oceny.md](kryteria-oceny.md)), [GLOSSARY.md](../GLOSSARY.md)
- 2026-10-03: Czat we froncie podłączony do `POST /api/v1/chat` (SSE) zgodnie z kontraktem z ADR 0005, nowy układ, obsługa błędów, tryb demo usunięty
- 2026-10-03: Czat przez Responses API: narzędzia razem z `reasoning_effort` (błąd 400 w Chat Completions), sprawdzone na prawdziwym modelu
- 2026-10-03: Limity i kontrola kosztu czatu ([0006](tasks/0006-limity-czatu.md)): nginx, backend, frontend, limit u dostawcy
- 2026-10-03: Czat i tagowanie innowacji na DeepSeek (`deepseek-flash`, Responses API) ([ADR 0007](adr/0007-deepseek.md)), do sprawdzenia na prawdziwym kluczu
