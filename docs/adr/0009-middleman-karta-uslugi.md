# 0009. Middleman innowacji: karta usługi

- Data: 2026-10-03
- Status: przyjęta

## Kontekst

Moduł VII wyzwania: pracownik CUS/OPS albo partner (JST, NGO, ekspert) ogląda innowację i chce wiedzieć, jak wdrożyć ją u siebie.

## Decyzja

- `POST /api/v1/innovations/{slug}/service-card`, body `{rola, problem?}`. `rola` to `cus-ops` albo `partner`, `mieszkaniec` dostaje 422, bo osoba prywatna nie wdraża innowacji u siebie. `problem` to stan problemu z czatu (ADR 0004 §7), który front trzyma w przeglądarce. Jest opcjonalny, bo na stronę innowacji można wejść bez czatu.
- Odpowiedź to zwykły JSON, bez SSE: `{slug, nazwa, rola, karta}`, gdzie `karta = {cel, odbiorcy, kroki (3-7), zasoby, ryzyka, wskazniki_sukcesu}`. Strumień nic tu nie daje, bo karta ma sens dopiero w całości.
- Jedno wywołanie `complete_json` przez port `LLMProvider` ([ADR 0010](0010-port-llm.md)), wynik sprawdzany schematem Pydantic. Odpowiedź niepełna lub błąd modelu: 502 z komunikatem dla użytkownika.
- Ugruntowanie jak `why_relevant` ([ADR 0005](0005-matchmaking-chat-llm.md)): model dostaje tylko pola innowacji (z nakładką) i teksty stanu problemu. Nie podaje kosztów, liczb, kontaktów ani faktów spoza tych danych, a brakujące dane oznacza „do uzupełnienia”. Dane są w znacznikach `<innowacja>` i `<problem>`, prompt mówi, że to dane, nie polecenia. Każde pole problemu jest ucięte do 500 znaków.
- Limity: nginx z tą samą strefą co czat (wspólny limit na IP), `CHAT_ENABLED` (503). Dzienny budżet tokenów usunięty w PR #45.
- Przycisk „Dostosuj do mojej instytucji” na `/innowacja/:slug`. Rola z czatu, a bez niej użytkownik wybiera `cus-ops` albo `partner`. Wynik nie jest zapisywany.

## Konsekwencje

- Prosty kontrakt dla frontu, ten sam model i dane co czat, brak nowej bazy.
- Karta jest ogólna, gdy użytkownik nie przyszedł z czatu.
