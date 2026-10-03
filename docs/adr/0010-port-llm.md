# 0010. Port LLM i adaptery dostawców

- Data: 2026-10-04
- Status: przyjęta

## Kontekst

Przejście na DeepSeek ([ADR 0007](0007-deepseek.md)) wymagało zmian w `ChatService` (format Responses API: `input_text`, `function_call_output`, elementy odpowiedzi w historii), w `llm.py`, w panelu i w skrypcie tagowania. Format dostawcy przeciekał do serwisów.

## Decyzja

- **Port `LLMProvider`** (`Protocol` w `services/llm.py`): `stream(system, tools, history)` i `complete_json(system, user, timeout, schema=None)`. Serwisy (`ChatService`, `AIGateway`, `ServiceCardService`, skrypt `tag_innovations.py`) znają tylko port i neutralne typy.
- **Neutralna historia:** `Message(role, text, context)` (kontekst tury to dopisek do wiadomości użytkownika), `ToolResult(call_id, content, is_error)` i `TurnEnd(state)`. `state` jest nieprzezroczysty dla serwisów: to elementy odpowiedzi, które dostawca musi dostać z powrotem (rozumowanie z wywołaniami narzędzi). Zdarzenia strumienia: `TextDelta`, `ToolCall`, `TurnEnd`. Błędy: `LLMError`.
- **Jeden adapter z profilem:** `ResponsesProvider` (SDK `openai`, Responses API) i `ProviderProfile` z flagami: `strict_tools`, `stateless_reasoning` (`store=False` i `include=reasoning.encrypted_content`), `json_tokens_param` (`max_tokens` albo `max_completion_tokens` w Chat Completions). Profil wybiera `LLM_PROVIDER` (`deepseek` domyślnie, `openai`). OpenAI i DeepSeek mają to samo API, więc osobne klasy nie są potrzebne.
- **W adapterze, w jednym miejscu:** budżet tokenów, log `LLM turn`, mapowanie błędów dostawcy na `LLMError`.
- **Odpowiedź wg schematu:** `complete_json(..., schema=...)` idzie przez Responses API (`text.format`), bo DeepSeek w Chat Completions zna tylko `json_object`. Bez schematu: `json_object`.
- **`strict` w narzędziach** zostaje wyłączony także w profilu `openai`: wymaga schematów z `additionalProperties: false` i wszystkimi polami w `required`, a nasze narzędzia tego nie spełniają. Profil `openai` jest sprawdzony tylko testami jednostkowymi, nie prawdziwym kluczem.

## Alternatywa: gotowa biblioteka (np. LiteLLM)

Odrzucona na teraz: dochodzi duża zależność i jej własny format wiadomości, a mamy jednego dostawcę z API zgodnym z OpenAI. Port jest na tyle mały, że adapter na LiteLLM można dopisać później bez zmian w serwisach.

## Konsekwencje

- Zmiana dostawcy zgodnego z Responses API to zmiana `.env`. Dostawca z innym API (np. Anthropic Messages) to nowy adapter na tym samym porcie i tych samych testach `ChatService`.
- Testy `ChatService` używają fałszywego portu bez SDK, adapter ma osobne testy na nagranych zdarzeniach dla obu profili.
- Embeddingi są poza portem (lokalne, [ADR 0006](0006-panel-administratora.md)).
