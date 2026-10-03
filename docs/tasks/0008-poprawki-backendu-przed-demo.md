# 0008. Poprawki backendu przed demo

- Status: todo
- Osoba: Bartłomiej (backend)

## Cel

Czat nie zwraca 500 z tracebackiem, gdy model jest niedostępny, a pole `organizacja` nie pokazuje nazwisk osób.

## Kroki

Brak klucza i awaria modelu
- [ ] Dziś przy pustym `OPENAI_API_KEY` `get_llm_service` (`api/deps.py`) rzuca `OpenAIError` i request kończy się 500. Zamiast tego: ostrzeżenie w logu przy starcie i odpowiedź 503 z komunikatem dla użytkownika („Asystent jest chwilowo niedostępny”)
- [ ] Błędy API modelu w trakcie strumienia kończą się zdarzeniem `error` z tym samym komunikatem, bez szczegółów technicznych
- [ ] `/api/v1/health` zwraca też, czy model jest skonfigurowany (np. `{"status": "ok", "llm": false}`), bez ujawniania klucza
- [ ] Testy: brak klucza, błąd API

Pole `organizacja`
- [ ] Poprawka po slugu w `InnovationRepository`, nie w `innowacje.json` i nie we froncie (ustalenie z PR #9, lista z [0007](0007-ustalenia-otwarte.md)): `sciezka-motosensoryczna`, `bez-presji-z-depresji`. Zostawić samą nazwę instytucji albo `null`
- [ ] Test: oba slugi z `/api/v1/innovations/{slug}` i z wyników czatu bez nazwisk

## Notatki

- Front ma już ogólny komunikat i „Spróbuj ponownie”, więc wystarczy, że dostanie 503 lub zdarzenie `error`.
