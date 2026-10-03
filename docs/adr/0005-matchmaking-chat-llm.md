# 0005. Rozmowa matchmakingu: bezstanowy backend, narzędzia modelu, SSE

- Data: 2026-10-03
- Status: przyjęta

## Kontekst

Demo (DEMO.md) wymaga rozmowy, w której AI ustala rolę, dopytuje (max 4 rundy), proponuje podsumowanie i pokazuje do 5 innowacji z bazy ROPS. Rozmowa nie jest zapisywana na backendzie. Baza ma 115 innowacji (pełna około 88 tys. tokenów, skrócony katalog około 17 tys.).

## Decyzja

- `POST /api/v1/chat`, odpowiedź SSE. Front wysyła całą historię, stan (`role`, `role_locked`, `problem`, `rounds`) i opcjonalną akcję (`show_results_now`, `confirm_summary`). Backend niczego nie zapisuje.
- Model OpenAI (Chat Completions, `LLM_MODEL`, domyślnie `gpt-5.6-sol`) działa przez narzędzia (function calling, `strict`): `set_role`, `update_problem`, `ask_question`, `propose_summary`, `search`, `show_results`.
- `search(slugs)`: skrócony katalog jest w system prompcie (cache), model wybiera do 8 kandydatów, backend zwraca ich pełne karty. `show_results` przyjmuje tylko slugi pobrane przez `search`; linki i kontakt dokleja backend z bazy, model ich nie pisze.
- Limity (4 rundy, 5 wyników, akcje użytkownika, zablokowana rola) egzekwuje backend: odrzuca niedozwolone wywołanie narzędzia błędem i model próbuje ponownie. Zestaw narzędzi jest stały, żeby nie psuć cache.
- Historia dla modelu to tekst: zdarzenie `done` zwraca `assistant_message`, który front odsyła dosłownie. Front nie przechowuje bloków API.
- Warstwy: `LLMService` (tylko API; jedyne miejsce zależne od dostawcy - narzędzia w `prompts.py` są w formacie neutralnym), `ChatService` (pętla narzędzi i reguły), `InnovationRepository` (JSON).

## Konsekwencje

- Brak bazy rozmów: prosto i bez danych wrażliwych, ale klient może zmienić historię lub stan (np. licznik rund). Na demo akceptowalne.
- Dopasowanie robi model na katalogu: trafne przy 115 pozycjach. Przy większej bazie `search` trzeba zastąpić wyszukiwaniem (pgvector), kontrakt z frontem się nie zmienia.
- Statystyki (anonimowe podsumowania) i zapis potrzeb bez dopasowania: później, osobno.
