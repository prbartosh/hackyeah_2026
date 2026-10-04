# Stan prac

Krótki przegląd. Szczegóły zadań w [tasks/](tasks/), decyzje w [adr/](adr/).

Zamknięte zadania usunięto z `tasks/` 2026-10-04: moduły I–IV, VI i VII są zmergowane, a testy na DeepSeek przeszły poprawnie. Zostały tylko zadania do zrobienia.

## W toku

- [0011](tasks/0011-materialy-dla-jury.md) Materiały dla jury (Nikodem, Wiktor): szkice w `docs/jury/`, reszta po działającym demo
- [0020](tasks/0020-odpornosc-frontendu.md) Odporność frontendu: zostaje sesja NVDA i raport
- [0035](tasks/0035-szybkie-przewagi.md) Szybkie przewagi: prosty język, czytanie na głos i deklaracja dostępności gotowe; zostaje pomiar trafności na DeepSeek (Wiktor)
- [0039](tasks/0039-dwustronny-watek.md) Dwustronny wątek zgłoszenia: zmergowany (#62), zostaje znacznik „nowa odpowiedź autora” w skrzynce i sprawdzenie w przeglądarce (Nikodem)
- [0043](tasks/0043-wspolpraca-z-rops.md) Strona „Współpraca z ROPS” `/wspolpraca`: zmergowana (#61), zostaje axe, klawiatura i widok 320 px (Nikodem)

## Do zrobienia

- [0021](tasks/0021-koszt-rozmowy.md) Redukcja kosztu rozmowy (opcjonalne), dziś ok. 297 tys. tokenów (Bartłomiej)
- [0022](tasks/0022-dostepnosc-nvda-klawiatura.md) Dostępność: axe i klawiatura zrobione (0 naruszeń), zostają testy NVDA i wejście głosowe w przeglądarkach (Daniel, Kacper)
- [0026](tasks/0026-motyw-malopolska-tokeny.md) Motyw Małopolska: kolory, typografia, tokeny (podstawa dla 0027–0034)
- [0027](tasks/0027-ornamenty-i-znak-splotu.md) Znak Splotu i ornamenty małopolskie
- [0028](tasks/0028-wspolne-komponenty-ui.md) Wspólne komponenty i spójność między modułami
- [0029](tasks/0029-naglowek-nawigacja-stopka.md) Nagłówek, nawigacja i stopka
- [0030](tasks/0030-strona-glowna-i-czat.md) Strona główna, czat i wyniki matchmakingu
- [0031](tasks/0031-zasobnik-i-strona-innowacji.md) Zasobnik wiedzy, strona innowacji i dokumenty
- [0032](tasks/0032-formularze-kreator-middleman-tester.md) Kreator, Middleman, Tester, zgłoszenia i wątek
- [0033](tasks/0033-panel-administratora-ui.md) Panel administratora: układ i czytelność
- [0034](tasks/0034-stany-ladowania-bledow-404.md) Stany ładowania, pustych wyników, błędów i 404

## Zrobione

- 2026-10-04: Obserwuj potrzebę (0045, moduł V): autor zaznacza „Powiadom mnie”, po publikacji pasującej karty dostaje wiadomość systemową w wątku i e-mail, migracja 0013 (#70); niesprawdzone na PostgreSQL
- 2026-10-04: Zapytaj instytucję, która to testuje (0044, moduł V): pytanie przez ROPS do wątku instytucji testującej, bez ujawniania kontaktów, migracja 0012 (#69); na istniejącej bazie raz `seed_tester.py`
- 2026-10-04: Rozmowa partnerska przez ROPS (0042): dwustronna korespondencja w Giełdzie partnerstw bez ujawniania e-maili, migracja 0011 (#64, [ADR 0013](adr/0013-gielda-partnerstw.md))
- 2026-10-04: Pytania do ROPS (0041): publiczne FAQ, publikacja za zgodą autora, moderacja w panelu, migracja 0010 (#63, [ADR 0015](adr/0015-pytania-do-rops.md))
- 2026-10-04: Mentorzy (0040): lista, prośba autora, przydział przez ROPS, odpowiedź mentora linkiem bez konta, migracja 0009 (#65, [ADR 0014](adr/0014-mentorzy.md))
- 2026-10-04: Giełda partnerstw (moduł V): ogłoszenia z moderacją ROPS, kontakt przez ROPS bez ujawniania adresów, zakładka w panelu, migracja 0008 (#58, [ADR 0013](adr/0013-gielda-partnerstw.md)); migracja i seed niesprawdzone na PostgreSQL
- 2026-10-04: Porównanie do 3 innowacji obok siebie: przełącznik na kartach, pasek, strona `/porownaj` z drukiem (#56); niesprawdzone w przeglądarce
- 2026-10-04: Otwarte dane: eksport innowacji i dokumentów w CSV i JSON, strona `/otwarte-dane` (#57); na produkcji ustawić `PUBLIC_BASE_URL`
- 2026-10-04: Dzienny budżet tokenów czatu usunięty (#45); zostają limity nginx, `CHAT_ENABLED` i dzienne limity wywołań AI panelu i kreatora
- 2026-10-04: „Podobne przypadki” w matchmakingu: zdarzenie SSE `similar_cases`, próg k = 5, blok pod wynikami ([ADR 0012](adr/0012-podobne-przypadki.md))
- 2026-10-04: Deterministyczne dopasowanie w panelu zamiast embeddingów (`services/matching.py`, tagi ze słownika, powody w UI, migracja 0007), usunięte `embed`, `reindex` i `/reindeksuj` ([ADR 0006](adr/0006-panel-administratora.md))
- 2026-10-04: Port LLM i adapter z profilami dostawców (`LLM_PROVIDER`), `ChatService`, panel, karta usługi i skrypt tagowania bez formatu Responses API ([ADR 0010](adr/0010-port-llm.md)); profil `openai` sprawdzony tylko testami jednostkowymi
- 2026-10-04: Limity nginx dla publicznych zapisów (`/zgloszenia`, `/kreator/`, `/opinie`, nowe: `/items`, `/admin/`), migracje sprawdzone na PostgreSQL 16 (up, down, up)
- 2026-10-04: Testy na prawdziwym modelu (DeepSeek) przeszły poprawnie, PR-y zmergowane
- 2026-10-03: Pierwsze uruchomienie stacku: stack, strony, axe, pytest, czat przez proxy na DeepSeek; pełna rozmowa to 6 wywołań modelu i ok. 297 tys. tokenów, więc limit 300 tys. to 1 rozmowa dziennie
- 2026-10-03: Ewaluacja dopasowania: skrypt `backend/scripts/eval_matchmaking.py`, pełny pomiar niepotrzebny (decyzja Bartosza)
- 2026-10-03: Frontend buduje się z `npm ci` na podstawie `package-lock.json`
- 2026-10-03: Pasek dostępności zwijany na mobile, axe na mobile 0 naruszeń
- 2026-10-03: Licencje danych ROPS: CC BY 4.0 przy 5 z 51 raportów, reszta bez licencji na stronie, GUS z podaniem źródła; w Zasobniku licencja tylko tam, gdzie jest
- 2026-10-03: Struktura repo, Docker Compose, frontend statycznie na nginx
- 2026-10-03: Scraper Biblioteki Innowacji, 115 innowacji w `assets/innowacje-spoleczne/` ([baza-innowacji.md](baza-innowacji.md))
- 2026-10-03: Scrapery raportów, publikacji, Mapy Wyzwań i Obserwatora Statystyk w `assets/`
- 2026-10-03: Obiekt innowacji, nakładka i słownik ([ADR 0004](adr/0004-obiekt-innowacji.md))
- 2026-10-03: Backend rozmowy matchmakingu: `POST /api/v1/chat` (SSE), `GET /api/v1/innovations/{slug}` ([ADR 0005](adr/0005-matchmaking-chat-llm.md))
- 2026-10-03: Mockup frontendu, strona innowacji `/innowacja/:slug`
- 2026-10-03: Ustalenia otwarte: obszary zespołu, zakres demo, limity, retencja, [zestaw testowy](zestaw-testowy.md)
- 2026-10-03: Kryteria oceny ([kryteria-oceny.md](kryteria-oceny.md)), [GLOSSARY.md](../GLOSSARY.md)
- 2026-10-03: Czat we froncie podłączony do `POST /api/v1/chat` (SSE) zgodnie z kontraktem z ADR 0005, nowy układ, obsługa błędów, tryb demo usunięty
- 2026-10-03: Czat przez Responses API: narzędzia razem z `reasoning_effort` (błąd 400 w Chat Completions), sprawdzone na prawdziwym modelu
- 2026-10-03: Limity i kontrola kosztu czatu: nginx, backend, frontend, limit u dostawcy
- 2026-10-03: Czat i tagowanie innowacji na DeepSeek (`deepseek-flash`, Responses API) ([ADR 0007](adr/0007-deepseek.md)), do sprawdzenia na prawdziwym kluczu
