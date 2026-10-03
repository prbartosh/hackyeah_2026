# 0008. Poprawki backendu przed demo

- Status: todo
- Osoba: Bartłomiej (backend)
- PR:

## Cel

Czat nie zwraca 500 z tracebackiem, gdy model jest niedostępny, a pole `organizacja` nie pokazuje nazwisk osób.

## Kroki

Brak klucza i awaria modelu
- [ ] Dziś przy pustym `LLM_API_KEY` `get_llm_service` (`api/deps.py`) rzuca `OpenAIError` (SDK `openai`, także dla DeepSeek) i request kończy się 500. Zamiast tego: ostrzeżenie w logu przy starcie i odpowiedź 503 z komunikatem dla użytkownika („Asystent jest chwilowo niedostępny”)
- [ ] Błędy API modelu w trakcie strumienia kończą się zdarzeniem `error` z tym samym komunikatem, bez szczegółów technicznych
- [ ] `/api/v1/health` zwraca też, czy model jest skonfigurowany (np. `{"status": "ok", "llm": false}`), bez ujawniania klucza
- [ ] Testy: brak klucza, błąd API

Pole `organizacja`
- [x] Poprawka po slugu w `InnovationRepository` (`CORRECTIONS`) dla `sciezka-motosensoryczna` (PR #9)
- [ ] To samo dla `bez-presji-z-depresji` (lista z [0007](0007-ustalenia-otwarte.md)): zostawić samą nazwę instytucji albo `null`
- [ ] Test: oba slugi z `/api/v1/innovations/{slug}` i z wyników czatu bez nazwisk

## Notatki

- Front ma już ogólny komunikat i „Spróbuj ponownie”, więc wystarczy, że dostanie 503 lub zdarzenie `error`.
- Obsługę błędów modelu (brak klucza, błąd w strumieniu, rate limit) najprościej zrobić raz, w porcie LLM z [0016](0016-adaptery-llm.md). Jeśli 0016 nie zdąży przed demo, poprawka idzie do obecnego `LLMService`.
- 2026-10-03 (Bartosz, z [0009](0009-ewaluacja-dopasowania.md)): `openai.APIError` rzucony w trakcie strumienia (np. rate limit u dostawcy) nie jest łapany w `LLMService.stream` (łapane są tylko `APIConnectionError` i `APIStatusError`). Wyjątek przechodzi do ASGI, strumień urywa się bez zdarzenia `error`. Poprawka tutaj, nie w 0016 (decyzja Bartosza).
