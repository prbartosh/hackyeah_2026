# 0009. Ewaluacja dopasowania

- Status: w toku
- Osoba: Bartosz (skrypt), Nikodem, Wiktor (ocena wyników, poprawki zestawu)
- PR: #23

## Cel

Liczba, która mówi, jak dobrze czat dopasowuje innowacje: ile razy oczekiwany `slug` z [zestawu testowego](../zestaw-testowy.md) jest na pierwszym miejscu i ile razy w wynikach. Mierzymy przed i po każdej zmianie promptu lub nakładki ([0005](0005-slownik-i-nakladka.md)).

## Kroki

- [x] Skrypt `backend/scripts/eval_matchmaking.py`: czyta tabelę z `docs/zestaw-testowy.md`, dla każdego zgłoszenia wysyła pierwszą wiadomość z rolą i akcję `show_results_now` (bez rund pytań), zbiera wyniki
- [x] Miary: trafienie na 1. miejscu, trafienie w wynikach (do 5), poprawne `no_good_match` dla zgłoszenia „brak”. Pozycje „niejednoznaczne” liczone także na 2. miejscu
- [x] Raport w markdown: tabela per zgłoszenie (oczekiwany, otrzymane, trafienie) i podsumowanie. Zapis wyniku z datą do sekcji „Wyniki” w `docs/zestaw-testowy.md`
- [ ] Powtórzyć pomiar (Bartosz): pierwszy pomiar na DeepSeek (`deepseek-flash`, [ADR 0007](../adr/0007-deepseek.md)), obecny prompt, z nakładką (nakładka z [0005](0005-slownik-i-nakladka.md) weszła do main przed pomiarem, decyzja Bartosza)
- [ ] Przegląd chybionych przypadków (Nikodem, Wiktor): błąd modelu czy błąd zestawu. Poprawki w zestawie

## Notatki

- Jeden przebieg to 28 rozmów na prawdziwym modelu. Sprawdzić koszt na podstawie pomiaru z [0002](0002-smoke-test.md), zanim zaczniemy uruchamiać skrypt często.
- Tryb bez pytań mierzy samo dopasowanie. Rozmowę z dopytaniem (symulowany użytkownik) można dodać później.
- 2026-10-03 (OpenAI, przed przejściem na DeepSeek): pierwszy przebieg bez przerw: 18 z 28 rozmów urwanych przez limit OpenAI 500 tys. tokenów na minutę (TPM liczy też cache). Rozmowa to ok. 130 tys. tokenów wejścia (3 wywołania × ok. 43 tys., prawie całość z cache), wyjście 200-300 tokenów na wywołanie. Skrypt ma przerwę między rozmowami (`--pause`, domyślnie 20 s). Na DeepSeek limity są inne, przerwę dobrać po pierwszym przebiegu. Wynik tego przebiegu nieważny, nie zapisany.
- Z 10 rozmów, które przeszły: 9 trafień na 1. miejscu. Chybione #1 (`kody-qr-na-pomoc-seniorom` poza wynikami; model dał `inteligentny-organizer-do-lekow`, `bawita`, `terapeuta-przestrzeni`).
- Błąd backendu (do [0008](0008-poprawki-backendu-przed-demo.md)): `openai.APIError` rzucony w trakcie strumienia (np. rate limit) nie jest łapany w `LLMService.stream`, strumień urywa się bez zdarzenia `error`.
- Logi aplikacji (`app.*`, w tym „LLM turn” z tokenami) są teraz widoczne w `docker compose logs backend`.
- Powtórny pomiar na DeepSeek robi Bartosz (pierwszy przebieg na OpenAI został przerwany limitem). Po nim Nikodem i Wiktor oceniają chybione, w tym #1 (`kody-qr-na-pomoc-seniorom`): sprawdzić, czy `inteligentny-organizer-do-lekow` nie jest równie uczciwym wynikiem i czy poprawić oczekiwany `slug` albo treść zgłoszenia w zestawie.
