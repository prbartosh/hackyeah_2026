# 0007. Model czatu: DeepSeek

- Data: 2026-10-03
- Status: przyjęta

## Kontekst

Czat ([ADR 0005](0005-matchmaking-chat-llm.md)), panel ([ADR 0006](0006-panel-administratora.md)) i tagowanie innowacji korzystały z OpenAI. Przechodzimy na DeepSeek.

## Decyzja

- Model `deepseek-flash` (`LLM_MODEL`), `LLM_BASE_URL=https://api.deepseek.com`, klucz w `LLM_API_KEY`.
- SDK `openai` i Responses API: DeepSeek je obsługuje, w tym narzędzia z `reasoning.effort`. Adapter i profile dostawców: [ADR 0010](0010-port-llm.md).
- DeepSeek ignoruje `store`, `include` i `strict` w narzędziach, więc ich nie wysyłamy. Rozumowanie wraca jako tekst w elemencie `reasoning` i musi wrócić w historii przy narzędziach.
- Brak API embeddingów: dopasowanie w panelu jest deterministyczne (ADR 0006).
- JSON z `complete_json`: `json_object` (Chat Completions) albo, ze schematem, Responses API z `text.format` (ADR 0010).

## Konsekwencje

- Bez `strict` model może zwrócić argumenty niezgodne ze schematem: `ChatService` odsyła błąd do modelu, nakładkę sprawdza `overlay_problems`.
- Powrót do OpenAI: `LLM_PROVIDER=openai` oraz `LLM_BASE_URL`, `LLM_MODEL` i klucz.
