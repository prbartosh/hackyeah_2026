# Stan prac

Krótki przegląd. Szczegóły zadań w [tasks/](tasks/), decyzje w [adr/](adr/). Zamknięte zadania są usuwane z `tasks/` i trafiają jedną linią do „Zrobione”. Stan 2026-10-04: wszystkie PR-y zmergowane, otwartych brak.

## W toku

- [0003](tasks/0003-zasobnik-wiedzy.md) Zasobnik wiedzy: zostaje ręczny test klawiaturą i NVDA (Bartłomiej, Daniel, Kacper)
- [0011](tasks/0011-materialy-dla-jury.md) Materiały dla jury: szkice w `docs/jury/`, reszta po działającym demo (Nikodem, Wiktor)
- [0020](tasks/0020-odpornosc-frontendu.md) Odporność frontendu: zostaje sesja NVDA i raport (Daniel)
- [0022](tasks/0022-dostepnosc-nvda-klawiatura.md) Dostępność: skrypt `npm run a11y` (axe, 228 stron, 0 naruszeń) i `npm run a11y:keys`, zostają testy NVDA i wejście głosowe (Daniel, Kacper)
- [0046](tasks/0046-przewodnik.md) Przewodnik po platformie: przycisk w nagłówku, rozdziały według modułów, na żywo (Nikodem)
- [0039](tasks/0039-dwustronny-watek.md) Dwustronny wątek zgłoszenia: zmergowany (#62), zostaje znacznik „nowa odpowiedź autora” w skrzynce (Nikodem)

## Do zrobienia

- [0026](tasks/0026-motyw-malopolska-tokeny.md) Motyw Małopolska: kolory, typografia, tokeny (podstawa dla 0027–0034; częściowo #60)
- [0027](tasks/0027-ornamenty-i-znak-splotu.md) Znak Splotu i ornamenty małopolskie
- [0028](tasks/0028-wspolne-komponenty-ui.md) Wspólne komponenty i spójność między modułami
- [0029](tasks/0029-naglowek-nawigacja-stopka.md) Nagłówek, nawigacja i stopka
- [0030](tasks/0030-strona-glowna-i-czat.md) Strona główna, czat i wyniki matchmakingu
- [0031](tasks/0031-zasobnik-i-strona-innowacji.md) Zasobnik wiedzy, strona innowacji i dokumenty
- [0032](tasks/0032-formularze-kreator-middleman-tester.md) Kreator, Middleman, Tester, zgłoszenia i wątek
- [0033](tasks/0033-panel-administratora-ui.md) Panel administratora: układ i czytelność
- [0034](tasks/0034-stany-ladowania-bledow-404.md) Stany ładowania, pustych wyników, błędów i 404

## Zrobione

- 2026-10-04: Koszt rozmowy zmierzony na DeepSeek (0021): ok. 48 tys. tokenów wejścia na wywołanie, z czego 97% z cache promptu (prefiks stały, pilnuje test). Skrót katalogu (`czy_dziala` 120/200 znaków) dawał 7–10% mniej tokenów, ale top 3 spadało do 34/35, więc zostaje 300. Niższy `reasoning_effort` niepotrzebny (już `low`)
- 2026-10-04: „Takie rozwiązania już działają” w kreatorze: potoczne aliasy przemocy w słowniku („bije”, „bicie”) i dopasowanie TF-IDF po rdzeniach słów (`TfidfIndex`) obok trigramów, lokalnie bez API
- 2026-10-04: Formularz „Zgłoś potrzebę”: walidacja pól jak w backendzie (opis 10–4000 znaków, e-mail), komunikat przy polu zamiast ogólnego „Sprawdź poprawność wpisanych danych”, licznik znaków i ostrzeżenie przed PESEL-em, testy `reportValidation.test.ts`
- 2026-10-04: Dane demo w repo: `backend/scripts/demo-data.json` ładuje się przy starcie do pustej bazy (`DEMO_DATA=true`), pełny panel po `git clone` bez seedowania; `scripts/demo_data.py` (load/export), `scripts/seed_demo_extra.py` (powiadomienia, importy, radar, rozmowy partnerskie)
- 2026-10-04: Strona `/wspolpraca`, hub modułu V: axe, klawiatura i 320 px bez uwag (0043, #61)
- 2026-10-04: Audyt dostępności w repo: `npm run a11y` (axe, wszystkie trasy i panel, 3 motywy, 2 szerokości) i `npm run a11y:keys`; poprawki w otwartych danych, kreatorze i panelu (0022)
- 2026-10-04: Ewaluacja trafności na DeepSeek: top 3 35/35, top 1 31/35, cache promptu 96%; prosty język, czytanie na głos, deklaracja dostępności (0035, #54); w logu 22× `show_results` bez `items` do sprawdzenia
- 2026-10-04: Wyszukiwanie po treści dokumentów w Zasobniku, `GET /api/v1/documents/search` (0003, #77)
- 2026-10-04: Test całości na main: `docker compose up --build` (w chmurze Claude potrzebne obrazy bazowe z CA proxy), migracje 0001–0013 na PostgreSQL 16 (up, down, up), seedy, pytest 238/238, lint, build i testy frontendu, smoke API modułu V, Playwright na wszystkich trasach i zakładkach panelu bez błędów konsoli i 4xx/5xx, limit nginx 20/min (429) sprawdzony, czat przez nginx na DeepSeek odpowiada. Niesprawdzone: e-mail.

Moduł V (komunikacja z ROPS):

- 2026-10-04: Giełda partnerstw: ogłoszenia z moderacją ROPS, kontakt przez ROPS bez ujawniania adresów, migracja 0008 (0036, #58, [ADR 0013](adr/0013-gielda-partnerstw.md))
- 2026-10-04: Mentorzy: lista, prośba autora, przydział przez ROPS, odpowiedź linkiem bez konta, migracja 0009 (0040, #65, [ADR 0014](adr/0014-mentorzy.md))
- 2026-10-04: Pytania do ROPS i publiczne FAQ za zgodą pytającego, migracja 0010 (0041, #63, [ADR 0015](adr/0015-pytania-do-rops.md))
- 2026-10-04: Rozmowy partnerskie przez ROPS, migracja 0011 (0042, #64, [ADR 0013](adr/0013-gielda-partnerstw.md))
- 2026-10-04: „Zapytaj instytucję, która to testuje”, migracja 0012 (0044, #69); na istniejącej bazie raz `scripts/seed_tester.py`
- 2026-10-04: „Obserwuj potrzebę”: powiadomienie autora o nowej pasującej karcie, migracja 0013 (0045, #70)

Pozostałe:

- 2026-10-04: Porównanie do 3 innowacji obok siebie, `/porownaj` (0037, #56)
- 2026-10-04: Otwarte dane: eksport CSV i JSON, `/otwarte-dane` (0038, #57); na produkcji ustawić `PUBLIC_BASE_URL`
- 2026-10-04: Motywy kolorystyczne Małopolski: pasek barw i tło (#60), filtr notatek modelu i fokus w czacie (#71), kontrast obramowań i Esc w oknie potwierdzenia (#53)
- 2026-10-04: Dzienny budżet tokenów czatu usunięty (#45); zostają limity nginx i `CHAT_ENABLED`
- 2026-10-04: „Podobne przypadki” w matchmakingu ([ADR 0012](adr/0012-podobne-przypadki.md))
- 2026-10-04: Deterministyczne dopasowanie w panelu zamiast embeddingów (`services/matching.py`, migracja 0007) ([ADR 0006](adr/0006-panel-administratora.md))
- 2026-10-04: Port LLM i adapter z profilami dostawców (`LLM_PROVIDER`) ([ADR 0010](adr/0010-port-llm.md)); profil `openai` sprawdzony tylko testami jednostkowymi
- 2026-10-04: Poprawki bezpieczeństwa (#73): logi bez IP, URI i danych osobowych, nagłówki bezpieczeństwa w nginx, wyłączony szablonowy endpoint `/items`, informacja o dostawcy AI przy czacie
- 2026-10-04: Limity nginx dla publicznych zapisów, migracje sprawdzone na PostgreSQL 16 (up, down, up)
- 2026-10-04: Testy na prawdziwym modelu (DeepSeek) przeszły ([ADR 0007](adr/0007-deepseek.md))
- 2026-10-03: Backend czatu: `POST /api/v1/chat` (SSE), `GET /api/v1/innovations/{slug}` ([ADR 0005](adr/0005-matchmaking-chat-llm.md)); czat we froncie
- 2026-10-03: Obiekt innowacji, nakładka i słownik ([ADR 0004](adr/0004-obiekt-innowacji.md))
- 2026-10-03: Scrapery w `assets/`: 115 innowacji ([baza-innowacji.md](baza-innowacji.md)), raporty, publikacje, Mapa Wyzwań, Obserwator
- 2026-10-03: Licencje danych ROPS: CC BY 4.0 przy 5 z 51 raportów, reszta bez licencji na stronie, GUS z podaniem źródła
- 2026-10-03: Skrypt ewaluacji dopasowania `backend/scripts/eval_matchmaking.py`
- 2026-10-03: Kryteria oceny ([kryteria-oceny.md](kryteria-oceny.md)), [zestaw testowy](zestaw-testowy.md), [GLOSSARY.md](../GLOSSARY.md)
- 2026-10-03: Struktura repo, Docker Compose, frontend statycznie na nginx
