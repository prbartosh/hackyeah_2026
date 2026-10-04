# Stan prac

Krótki przegląd. Szczegóły zadań w [tasks/](tasks/), decyzje w [adr/](adr/). Zamknięte zadania są usuwane z `tasks/` i trafiają jedną linią do „Zrobione”. Stan 2026-10-04: wszystkie PR-y zmergowane, otwartych brak.

## W toku

- [0003](tasks/0003-zasobnik-wiedzy.md) Zasobnik wiedzy: zostaje ręczny test klawiaturą i NVDA (Bartłomiej, Daniel, Kacper)
- [0011](tasks/0011-materialy-dla-jury.md) Materiały dla jury: szkice w `docs/jury/`, reszta po działającym demo (Nikodem, Wiktor)
- [0020](tasks/0020-odpornosc-frontendu.md) Odporność frontendu: zostaje sesja NVDA i raport (Daniel)
- [0022](tasks/0022-dostepnosc-nvda-klawiatura.md) Dostępność: axe i klawiatura gotowe (0 naruszeń), zostają testy NVDA i wejście głosowe (Daniel, Kacper)
- [0035](tasks/0035-szybkie-przewagi.md) Szybkie przewagi: funkcje zmergowane (#54), zostaje pełna ewaluacja na DeepSeek (liczba na slajd) (Wiktor)
- [0039](tasks/0039-dwustronny-watek.md) Dwustronny wątek zgłoszenia: zmergowany (#62), zostaje znacznik „nowa odpowiedź autora” w skrzynce i sprawdzenie w przeglądarce (Nikodem)
- [0043](tasks/0043-wspolpraca-z-rops.md) Strona „Współpraca z ROPS” `/wspolpraca`: zmergowana (#61), zostaje axe, klawiatura i widok 320 px (Nikodem)

## Do zrobienia

- [0021](tasks/0021-koszt-rozmowy.md) Redukcja kosztu rozmowy (opcjonalne), dziś ok. 297 tys. tokenów (Bartłomiej)
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

- 2026-10-04: Test całości na main bez Dockera (build obrazu blokuje certyfikat proxy w środowisku chmurowym): migracje 0001–0013 na PostgreSQL 16 (up, down, up), seedy, pytest 238/238, lint, build i testy frontendu, smoke API modułu V, Playwright na wszystkich trasach i zakładkach panelu bez błędów konsoli i 4xx/5xx. Niesprawdzone: czat (brak klucza w trakcie testu), nginx w Dockerze, e-mail. `ruff check` zgłasza 23 błędy (E501 w starych plikach, I001 w `scripts/dev_panel.py`)

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
