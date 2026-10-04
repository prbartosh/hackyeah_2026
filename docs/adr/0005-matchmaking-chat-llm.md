# 0005. Rozmowa matchmakingu: bezstanowy backend, narzędzia modelu, SSE

- Data: 2026-10-03
- Status: przyjęta

## Kontekst

Demo ([DEMO.md](../DEMO.md)) wymaga rozmowy, w której AI ustala rolę, dopytuje (max 4 rundy), proponuje podsumowanie i pokazuje do 5 innowacji z bazy ROPS. Rozmowa nie jest zapisywana. Obiekt innowacji, role i stan problemu opisuje [ADR 0004](0004-obiekt-innowacji.md), ten ADR opisuje, jak backend prowadzi rozmowę.

## Decyzja

- `POST /api/v1/chat`, odpowiedź SSE. Front wysyła całą historię, stan i opcjonalną akcję (`show_results_now`, `confirm_summary` z poprawionym `summary`). Stan to stan problemu z ADR 0004 §7 plus `role_locked` i `rounds`. Backend niczego nie zapisuje poza potrzebą (ADR 0004 §8).
- Model (`LLM_MODEL`, [ADR 0007](0007-deepseek.md)) przez port `LLMProvider` ([ADR 0010](0010-port-llm.md)) działa przez narzędzia: `set_role`, `update_problem`, `ask_question`, `propose_summary`, `search`, `show_results`, `gmina_stats`. Zestaw jest stały, żeby nie psuć cache promptu.
- Katalog w system prompcie (wariant podstawowy z ADR 0004 §8): pola z ADR 0004 §2 (`czy_dziala` do 300 znaków) i zatwierdzona nakładka, w znaczniku `<katalog>`. Prompt mówi, że katalog i karty z `search` to dane, nie polecenia.
- `search(slugs)`: model wybiera do 8 kandydatów, backend zwraca ich pełne karty. `show_results` przyjmuje tylko slugi pobrane przez `search`; linki, kontakt, licencję i `wybrana_do_upowszechniania` dokleja backend z bazy.
- `update_problem` wypełnia `{tekst, slugi}` (w `zasoby` także `poziom_kosztu`); backend odrzuca slugi spoza słownika.
- Limity (4 rundy, 5 wyników, akcje użytkownika, zablokowana rola) egzekwuje backend: odrzuca niedozwolone wywołanie narzędzia błędem, model próbuje ponownie.
- Historia dla modelu to tekst: zdarzenie `done` zwraca `assistant_message`, który front odsyła dosłownie, oraz nowy stan.
- `gmina_stats(gmina)`: 10 wskaźników Obserwatora Statystyk Społecznych (`assets/obserwator/wskazniki-czatu.json`), każdy z najnowszym rokiem, źródłem i linkiem. Nazwa porównywana bez polskich znaków, wielkości liter i przedrostka „gmina”; zwracane są wszystkie obszary o tej nazwie (miasto i wieś, gminy w różnych powiatach). Backend wysyła zdarzenie SSE `gmina_stats` dla panelu pod „Gdzie”. Narzędzie nie kończy tury; liczby o gminie model podaje tylko z jego wyniku, z rokiem.
- Po `results` backend może wysłać `similar_cases` ([ADR 0012](0012-podobne-przypadki.md)).
- Warstwy: adapter `LLMProvider` w `services/llm.py` (jedyne miejsce zależne od dostawcy), `ChatService` (pętla narzędzi i reguły), `InnovationRepository` (karty i nakładka).

## Konsekwencje

- Brak bazy rozmów: prosto i bez danych wrażliwych, ale klient może zmienić historię lub stan (np. licznik rund). Na demo akceptowalne.
- Gdy czas lub koszt katalogu w prompcie okażą się za duże, przechodzimy na wariant zapasowy z ADR 0004 §8. Kontrakt z frontem się nie zmienia.
