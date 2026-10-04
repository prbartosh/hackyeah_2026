# 0010. Port LLM i adaptery dostawców

- Data: 2026-10-04
- Status: przyjęta

## Kontekst

Format Responses API (`input_text`, `function_call_output`, elementy odpowiedzi w historii) przeciekał do `ChatService`, panelu i skryptu tagowania. Zastępuje podejście z [ADR 0007](0007-deepseek.md), w którym serwisy znały format dostawcy.

## Decyzja

- **Port `LLMProvider`** (`Protocol` w `services/llm.py`): `stream(system, tools, history)` i `complete_json(system, user, timeout, schema=None)`. Serwisy (`ChatService`, `AIGateway`, `ServiceCardService`, `tag_innovations.py`) znają tylko port i neutralne typy.
- **Neutralne typy:** `Message(role, text, context)`, `ToolResult(call_id, content, is_error)`, `TurnEnd(state)`. `state` jest nieprzezroczysty dla serwisów: to elementy odpowiedzi, które dostawca musi dostać z powrotem (rozumowanie z wywołaniami narzędzi). Zdarzenia strumienia: `TextDelta`, `ToolCall`, `TurnEnd`. Błędy dostawcy mapowane na `LLMError` w adapterze.
- **Jeden adapter z profilem:** `ResponsesProvider` (SDK `openai`, Responses API) i `ProviderProfile` z flagami `strict_tools`, `stateless_reasoning` (`store=False` i zaszyfrowane rozumowanie), `json_tokens_param`. Profil wybiera `LLM_PROVIDER` (`deepseek` domyślnie, `openai`).
- **Odpowiedź wg schematu:** `complete_json(..., schema=...)` idzie przez Responses API (`text.format`), bo DeepSeek w Chat Completions zna tylko `json_object`. Bez schematu: `json_object`.
- **`strict` w narzędziach** wyłączony także w profilu `openai` (wymaga `additionalProperties: false` i wszystkich pól w `required`, czego nasze narzędzia nie spełniają). Profil `openai` sprawdzony tylko testami jednostkowymi.
- Odrzucona gotowa biblioteka (LiteLLM): duża zależność i własny format wiadomości przy jednym dostawcy; adapter można dopisać później bez zmian w serwisach.

## Konsekwencje

- Zmiana dostawcy zgodnego z Responses API to zmiana `.env`. Dostawca z innym API to nowy adapter na tym samym porcie.
- Testy `ChatService` używają fałszywego portu bez SDK, adapter ma osobne testy dla obu profili.
