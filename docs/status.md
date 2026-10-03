# Stan prac

Krótki przegląd. Szczegóły zadań w [tasks/](tasks/), decyzje w [adr/](adr/).

## W toku

- [0001](tasks/0001-package-lock.md) package-lock.json i npm ci (Daniel, Kacper): lock jest, brakuje `npm ci` w Dockerfile
- [0003](tasks/0003-zasobnik-wiedzy.md) Zasobnik wiedzy, moduł II (Bartłomiej, Daniel, Kacper): innowacje (backend i frontend) w [PR #9](https://github.com/prbartosh/hackyeah_2026/pull/9), dokumenty nie zaczęte, brakuje testu z czytnikiem ekranu
- [0002](tasks/0002-smoke-test.md) Pierwsze uruchomienie stacku (Bartosz): stack, strony i axe sprawdzone, czat czeka na klucz i test z prawdziwym modelem
- [0005](tasks/0005-slownik-i-nakladka.md) Słownik i nakładka innowacji (Bartłomiej): dane i kod są, czeka na przegląd słownika i wyrywkowy przegląd nakładki
- [0006](tasks/0006-limity-czatu.md) Limity i kontrola kosztu czatu (Bartłomiej, Bartosz, Nikodem: panel DeepSeek): nginx, backend i frontend gotowe, brakuje limitu w panelu DeepSeek, testu 429 na stacku i ustawienia `LLM_DAILY_TOKEN_LIMIT`

## Do zrobienia

- [0004](tasks/0004-zapis-potrzeb.md) Zapis potrzeb przy każdej odpowiedzi z wynikami (Bartłomiej)
- [0008](tasks/0008-poprawki-backendu-przed-demo.md) Poprawki backendu przed demo: błąd przy braku klucza, pole `organizacja` (Bartłomiej)
- [0009](tasks/0009-ewaluacja-dopasowania.md) Ewaluacja dopasowania na zestawie testowym (Bartosz, Nikodem, Wiktor)
- [0010](tasks/0010-dostepnosc-mobile-i-glos.md) Pasek dostępności na mobile i wejście głosowe (Daniel)
- [0011](tasks/0011-materialy-dla-jury.md) Materiały dla jury (Nikodem, Wiktor)
- [0012](tasks/0012-middleman-innowacji.md) Moduł VII Middleman innowacji (Bartosz, Kacper)
- [0013](tasks/0013-dane-gminy-w-czacie.md) Dane gminy z Obserwatora w czacie (Bartosz)

## Do zaprojektowania

- „Podobne przypadki” w matchmakingu (moduł I): osobny ADR, korzysta z zapisu potrzeb

## Zrobione

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
- 2026-10-03: Czat i tagowanie innowacji na DeepSeek (`deepseek-flash`, Responses API) ([ADR 0006](adr/0006-deepseek.md)), do sprawdzenia na prawdziwym kluczu
