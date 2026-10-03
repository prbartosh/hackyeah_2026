# Stan prac

Krótki przegląd. Szczegóły zadań w [tasks/](tasks/), decyzje w [adr/](adr/).

## W toku

- [0001](tasks/0001-package-lock.md) package-lock.json i npm ci (Daniel, Kacper): lock jest, brakuje `npm ci` w Dockerfile
- [0003](tasks/0003-zasobnik-wiedzy.md) Zasobnik wiedzy, moduł II (Bartłomiej, Daniel, Kacper): frontend w [PR #9](https://github.com/prbartosh/hackyeah_2026/pull/9), backend nie zaczęty
- [0005](tasks/0005-slownik-i-nakladka.md) Słownik i nakładka innowacji (bartek pietrzak): dane i kod są, czeka na przegląd słownika i wyrywkowy przegląd nakładki

## Do zrobienia

- [0002](tasks/0002-smoke-test.md) Pierwsze uruchomienie stacku (Bartosz)
- [0004](tasks/0004-zapis-potrzeb.md) Zapis potrzeb przy każdej odpowiedzi z wynikami (Bartłomiej)
- [0006](tasks/0006-limity-czatu.md) Limity i kontrola kosztu czatu (Bartłomiej, Bartosz), wartości do zatwierdzenia
- [0007](tasks/0007-ustalenia-otwarte.md) Ustalenia otwarte: obszary, zakres demo, limity, retencja, zestaw testowy (Nikodem, Wiktor)

## Do zaprojektowania

- „Podobne przypadki” w matchmakingu (moduł I): osobny ADR, korzysta z zapisu potrzeb
- Dodatkowy moduł wyzwania (+5%): decyzja w 0007

## Zrobione

- 2026-10-03: Struktura repo, Docker Compose, frontend statycznie na nginx
- 2026-10-03: Scraper Biblioteki Innowacji, 115 innowacji w `assets/innowacje-spoleczne/` ([baza-innowacji.md](baza-innowacji.md))
- 2026-10-03: Scrapery raportów, publikacji, Mapy Wyzwań i Obserwatora Statystyk w `assets/`
- 2026-10-03: Obiekt innowacji, nakładka i słownik ([ADR 0004](adr/0004-obiekt-innowacji.md))
- 2026-10-03: Backend rozmowy matchmakingu: `POST /api/v1/chat` (SSE), `GET /api/v1/innovations/{slug}` ([ADR 0005](adr/0005-matchmaking-chat-llm.md))
- 2026-10-03: Mockup frontendu, strona innowacji `/innowacja/:slug`
- 2026-10-03: Kryteria oceny ([kryteria-oceny.md](kryteria-oceny.md)), [GLOSSARY.md](../GLOSSARY.md)
