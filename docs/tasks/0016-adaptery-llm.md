# 0016. Port LLM i adaptery dostawców

- Status: todo
- Osoba: Bartłomiej (backend)
- PR:

## Cel

Logika czatu i panelu nie zależy od dostawcy modelu. Serwisy rozmawiają z jednym portem w neutralnym formacie, a adapter wybrany w konfiguracji (`LLM_PROVIDER`) tłumaczy to na API dostawcy. Zmiana dostawcy to zmiana `.env` albo nowy adapter, bez zmian w `ChatService` i panelu.

## Kroki

Etap 1: port i adapter dla obecnego zachowania (bez zmian funkcjonalnych)
- [ ] ADR 0008: port LLM, neutralny format historii, wybór adaptera, co należy do adaptera (flagi i quirki dostawcy), alternatywa z gotową biblioteką (np. LiteLLM) i dlaczego tak albo nie
- [ ] Neutralne typy: wiadomość (rola, tekst), definicja narzędzia, wywołanie narzędzia, wynik narzędzia, tura asystenta z nieprzezroczystym stanem dostawcy (np. rozumowanie, które trzeba odesłać w historii), zdarzenia strumienia (tekst, wywołanie narzędzia, koniec tury), zużycie tokenów, `LLMError`
- [ ] Port `LLMProvider` (Protocol): `stream(system, tools, history)` i `complete_json(system, user)`
- [ ] Adapter Responses API (SDK `openai`) z profilem dostawcy. Profil `deepseek`: bez `strict`, `store`, `include`, w Chat Completions `max_tokens`. Profil `openai`: `strict`, `store=False`, zaszyfrowane rozumowanie. Wybór przez `LLM_PROVIDER` (domyślnie `deepseek`)
- [ ] `ChatService` i `AIGateway` bez formatu Responses API: znikają z nich `input_text`, `function_call_output` i `TurnEnd.items`
- [ ] W jednym miejscu: budżet tokenów, log `LLM turn`, mapowanie błędów (brak klucza, błąd i rate limit w trakcie strumienia). Obsługa błędu w trakcie strumienia jest w [0008](0008-poprawki-backendu-przed-demo.md)
- [ ] `scripts/tag_innovations.py` przez ten sam adapter (dziś ma własnego klienta `openai`)
- [ ] Testy: `ChatService` na fałszywym adapterze (bez SDK), adapter na nagranych zdarzeniach dla obu profili
- [ ] Dokumentacja: ADR 0005 i 0007, `.env.example` (`LLM_PROVIDER`)

Etap 2: tylko gdy będzie potrzebny dostawca z innym API
- [ ] Kolejny adapter (np. Anthropic Messages API) na tym samym porcie i tych samych testach kontraktu

## Notatki

- Powód: przejście na DeepSeek (PR #17, #24) wymagało zmian w `ChatService` (format Responses API), w `llm.py`, w panelu (klucz, `max_tokens`, embeddingi) i w skrypcie tagowania. Dziś format dostawcy przecieka do serwisów.
- OpenAI i DeepSeek używają tego samego Responses API i różnią się flagami, więc wystarczy jeden adapter z profilem. Osobna klasa na dostawcę ma sens dopiero przy innym API.
- Ryzyko: refaktor przed demo. Etap 1 nie zmienia zachowania. Do sprawdzenia przez obecne testy i [0009](0009-ewaluacja-dopasowania.md) (ten sam wynik ewaluacji przed i po zmianie).
- Embeddingi są poza zakresem: [0017](0017-dopasowanie-deterministyczne-panel.md).
- `scripts/eval_matchmaking.py` woła backend po HTTP, więc zmiana go nie dotyczy.
- Po wejściu portu przepiąć `ServiceCardService` z [0012](0012-middleman-innowacji.md) (dziś `LLMService.complete_json`).
