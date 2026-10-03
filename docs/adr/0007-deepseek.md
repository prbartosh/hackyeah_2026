# 0007. Model czatu: DeepSeek

- Data: 2026-10-03
- Status: przyjęta

## Kontekst

Czat matchmakingu ([ADR 0005](0005-matchmaking-chat-llm.md)) i skrypt tagowania innowacji korzystały z OpenAI. Przechodzimy na DeepSeek.

## Decyzja

- Model `deepseek-flash` (`LLM_MODEL`) przez `https://api.deepseek.com` (`LLM_BASE_URL`), klucz w `LLM_API_KEY`.
- Zostaje SDK `openai` i Responses API: DeepSeek je obsługuje, w tym narzędzia razem z `reasoning.effort` (`low` / `high` / `max`).
- Nie wysyłamy `store`, `include` ani `strict` w narzędziach: DeepSeek je ignoruje. Rozumowanie wraca jako zwykły tekst w elemencie `reasoning` i odsyłamy je w historii (przy narzędziach DeepSeek tego wymaga).
- Panel administratora ([ADR 0006](0006-panel-administratora.md)): DeepSeek nie ma API embeddingów, więc wektory są zawsze lokalne (`local-trigram-v1`). Triaż, import dokumentu i nazwy klastrów (`complete_json`) idą przez DeepSeek Chat Completions w trybie `json_object` z `max_tokens`. Zamiennik embeddingów: deterministyczne dopasowanie z `matching.py` ([ADR 0006](0006-panel-administratora.md)).
- Skrypt `tag_innovations.py` używa Responses API z `text.format` (`json_schema`), bo Chat Completions w DeepSeek ma tylko `json_object`.

## Konsekwencje

- Mała zmiana w kodzie, kontrakt czatu bez zmian.
- Bez `strict` model może zwrócić argumenty niezgodne ze schematem. `ChatService` już łapie złe argumenty i odsyła błąd do modelu, nakładkę sprawdza `overlay_problems`.
- Powrót do OpenAI: zmiana `LLM_PROVIDER=openai`, `LLM_BASE_URL`, `LLM_MODEL` i klucza ([ADR 0010](0010-port-llm.md)); profil `openai` wysyła `store=false` i zaszyfrowane rozumowanie, `strict` zostaje wyłączony.
