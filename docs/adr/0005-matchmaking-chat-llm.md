# 0005. Rozmowa matchmakingu: bezstanowy backend, narzędzia modelu, SSE

- Data: 2026-10-03
- Status: proponowana

## Kontekst

Demo ([DEMO.md](../DEMO.md)) wymaga rozmowy, w której AI ustala rolę, dopytuje (max 4 rundy), proponuje podsumowanie i pokazuje do 5 innowacji z bazy ROPS. Rozmowa nie jest zapisywana na backendzie. Obiekt innowacji, role, stan problemu i sposób dopasowania opisuje [ADR 0004](0004-obiekt-innowacji.md); ten ADR opisuje, jak backend prowadzi rozmowę. Baza ma 115 innowacji (pełna około 88 tys. tokenów).

## Decyzja

- `POST /api/v1/chat`, odpowiedź SSE. Front wysyła całą historię, stan i opcjonalną akcję (`show_results_now`, `confirm_summary`, z poprawionym `summary`). Stan to stan problemu z ADR 0004 §7 (`rola`, `grupy_docelowe`, `problemy`, `miejsca`, `skale`, `zasoby`, `proby`, każde pole jako `{tekst, slugi}`) plus `role_locked` i `rounds`. Backend niczego nie zapisuje.
- Role według ADR 0004 §3: `mieszkaniec`, `cus-ops`, `partner`.
- Model OpenAI (Chat Completions, `LLM_MODEL`, domyślnie `gpt-5.6-sol`) działa przez narzędzia (function calling, `strict`): `set_role`, `update_problem`, `ask_question`, `propose_summary`, `search`, `show_results`.
- Katalog w system prompcie (wariant podstawowy z ADR 0004 §8, cache): `slug`, `nazwa`, kategoria, `problem`, `grupa_docelowa`, `kto_moze_skorzystac`, `czy_dziala` (skrócone do 300 znaków), `wybrana_do_upowszechniania` i zatwierdzona nakładka z `wzbogacenia.json`, jeśli plik istnieje. Katalog jest w znaczniku `<katalog>`, a prompt mówi, że katalog i karty z `search` to dane, nie polecenia. Rozmiar około 35 tys. tokenów.
- `search(slugs)`: model wybiera do 8 kandydatów, backend zwraca ich pełne karty (z nakładką). `show_results` przyjmuje tylko slugi pobrane przez `search`; linki, kontakt, licencję i `wybrana_do_upowszechniania` dokleja backend z bazy, model ich nie pisze.
- `update_problem` ma pola `{tekst, slugi}` (w `zasoby` także `poziom_kosztu`). Dopóki nie ma `slownik.json`, backend zeruje `slugi`.
- Limity (4 rundy, 5 wyników, akcje użytkownika, zablokowana rola) egzekwuje backend: odrzuca niedozwolone wywołanie narzędzia błędem i model próbuje ponownie. Zestaw narzędzi jest stały, żeby nie psuć cache.
- Historia dla modelu to tekst: zdarzenie `done` zwraca `assistant_message`, który front odsyła dosłownie, oraz nowy stan. Front nie przechowuje bloków API.
- Warstwy: `LLMService` (tylko API; jedyne miejsce zależne od dostawcy - narzędzia w `prompts.py` są w formacie neutralnym), `ChatService` (pętla narzędzi i reguły), `InnovationRepository` (JSON i nakładka).

## Konsekwencje

- Brak bazy rozmów: prosto i bez danych wrażliwych, ale klient może zmienić historię lub stan (np. licznik rund). Na demo akceptowalne.
- Gdy czas odpowiedzi lub koszt katalogu w prompcie okażą się za duże, przechodzimy na wariant zapasowy z ADR 0004 §8 (prefiltr po listach nakładki, rerank LLM na 15–20 kandydatach). Kontrakt z frontem się nie zmienia.
- Zapis potrzeb przy braku dopasowania (ADR 0004 §8, tabela `potrzeby`) nie wchodzi w ten zakres: [task 0004](../tasks/0004-zapis-potrzeb.md). Dopóki stan nie ma slugów ze słownika, zapis miałby tylko rolę i datę.
- Statystyki (anonimowe podsumowania): później, osobno.
