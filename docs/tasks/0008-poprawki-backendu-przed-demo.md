# 0008. Poprawki backendu przed demo

- Status: w toku
- Osoba: Bartłomiej (backend)
- PR:

## Cel

Czat nie zwraca 500 z tracebackiem, gdy model jest niedostępny, a pole `organizacja` nie pokazuje nazwisk osób.

## Kroki

Brak klucza i awaria modelu
- [x] Dziś przy pustym `LLM_API_KEY` `get_llm_service` (`api/deps.py`) rzuca `OpenAIError` (SDK `openai`, także dla DeepSeek) i request kończy się 500. Zamiast tego: ostrzeżenie w logu przy starcie i odpowiedź 503 z komunikatem dla użytkownika („Asystent jest chwilowo niedostępny”)
- [x] Błędy API modelu w trakcie strumienia kończą się zdarzeniem `error` z tym samym komunikatem, bez szczegółów technicznych
- [x] `/api/v1/health` zwraca też, czy model jest skonfigurowany (np. `{"status": "ok", "llm": false}`), bez ujawniania klucza
- [x] Testy: brak klucza, błąd API

Pole `organizacja`
- [x] Poprawka po slugu w `InnovationRepository` (`CORRECTIONS`) dla `sciezka-motosensoryczna` (PR #9)
- [x] To samo dla `bez-presji-z-depresji` (lista z [0007](0007-ustalenia-otwarte.md)): zostawić samą nazwę instytucji albo `null`
- [x] Test: oba slugi z `/api/v1/innovations/{slug}` i z wyników czatu bez nazwisk

## Notatki

- Front ma już ogólny komunikat i „Spróbuj ponownie”, więc wystarczy, że dostanie 503 lub zdarzenie `error`.
- Obsługę błędów modelu (brak klucza, błąd w strumieniu, rate limit) najprościej zrobić raz, w porcie LLM z [0016](0016-adaptery-llm.md). Jeśli 0016 nie zdąży przed demo, poprawka idzie do obecnego `LLMService`.
- Poprawka trafiła do obecnego `LLMService` i `ChatService` ([0016](0016-adaptery-llm.md) nie zaczęte). Komunikat dla użytkownika: `LLM_UNAVAILABLE` w `services/chat.py`, szczegóły błędu tylko w logu. `LLMService.stream` mapuje też pozostałe `openai.OpenAIError` na `LLMError`.
- `bez-presji-z-depresji`: w `organizacja` zostaje „Instytut HR”. Karty już zaimportowane do bazy (panel, ADR 0006) mają starą wartość, bo import z plików idzie tylko do pustej tabeli. Poprawić w panelu albo zaimportować od nowa.
