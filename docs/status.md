# Stan prac

Przegląd w jednej linii na zadanie. Szczegóły i kroki w [tasks/](tasks/), decyzje w [adr/](adr/).

## W toku

- [0003](tasks/0003-zasobnik-wiedzy.md) Zasobnik wiedzy (moduł II): zostaje ręczny test klawiaturą i czytnikiem ekranu
- [0005](tasks/0005-slownik-i-nakladka.md) Słownik i nakładka innowacji: zostaje przegląd słownika i wyrywkowy przegląd nakładki
- [0011](tasks/0011-materialy-dla-jury.md) Materiały dla jury: szkice w [jury/](jury/), reszta po działającym demo
- [0012](tasks/0012-middleman-innowacji.md) Middleman innowacji (moduł VII): zostaje przejście z prawdziwym kluczem DeepSeek
- [0013](tasks/0013-dane-gminy-w-czacie.md) Dane gminy w czacie: zostaje test na prawdziwym modelu
- [0015](tasks/0015-panel-administratora.md) Panel administratora (moduł VI, [jak uruchomić](panel-administratora.md)): zostaje NVDA i przejście z kluczem DeepSeek
- [0018](tasks/0018-kreator-pomyslow.md) Kreator pomysłów (moduł III, [jak uruchomić](kreator-pomyslow.md)): zostaje NVDA, klucz DeepSeek i sprawdzenie szablonu canvy
- [0019](tasks/0019-tester-innowacji.md) Tester innowacji (moduł IV): zostaje NVDA

## Do zrobienia

- [0016](tasks/0016-adaptery-llm.md) Port LLM i adaptery dostawców (Bartłomiej)
- [0017](tasks/0017-dopasowanie-deterministyczne-panel.md) Deterministyczne dopasowanie w panelu zamiast embeddingów, czeka na 5 decyzji (Kacper)

## Do zaprojektowania

- „Podobne przypadki” w matchmakingu (moduł I): osobny ADR, korzysta z zapisu potrzeb ([0004](tasks/0004-zapis-potrzeb.md))

## Zrobione

- [0001](tasks/0001-package-lock.md) Frontend buduje się z `npm ci`
- [0002](tasks/0002-smoke-test.md) Smoke test stacku: czat przez proxy na DeepSeek, pytest, axe
- [0004](tasks/0004-zapis-potrzeb.md) Zapis potrzeb przy wynikach czatu
- [0006](tasks/0006-limity-czatu.md) Limity czatu (bez budżetu tokenów)
- [0007](tasks/0007-ustalenia-otwarte.md) Ustalenia otwarte, [zestaw testowy](zestaw-testowy.md)
- [0008](tasks/0008-poprawki-backendu-przed-demo.md) Poprawki backendu przed demo (503 bez klucza, błędy w strumieniu, `organizacja`)
- [0009](tasks/0009-ewaluacja-dopasowania.md) Skrypt ewaluacji dopasowania `eval_matchmaking.py`
- [0010](tasks/0010-dostepnosc-mobile-i-glos.md) Pasek dostępności na mobile, wejście głosowe
- [0014](tasks/0014-licencje-danych-rops.md) Licencje danych ROPS
- Struktura repo, Docker Compose, frontend na nginx ([ADR 0001–0003](adr/))
- Scrapery: 115 innowacji, raporty, publikacje, Mapa Wyzwań, Obserwator ([baza-innowacji.md](baza-innowacji.md))
- Obiekt innowacji, nakładka i słownik ([ADR 0004](adr/0004-obiekt-innowacji.md))
- Czat matchmakingu: backend SSE i front ([ADR 0005](adr/0005-matchmaking-chat-llm.md)), DeepSeek ([ADR 0007](adr/0007-deepseek.md))
- [Kryteria oceny](kryteria-oceny.md), [GLOSSARY.md](../GLOSSARY.md), [pomysły na przewagę](pomysly-na-przewage.md)
