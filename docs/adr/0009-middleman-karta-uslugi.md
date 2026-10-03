# 0009. Middleman innowacji: karta usługi

- Data: 2026-10-03
- Status: proponowana

## Kontekst

Moduł VII wyzwania (+5%, decyzja z [0007](../tasks/0007-ustalenia-otwarte.md)): pracownik CUS/OPS albo partner (JST, NGO, ekspert) ogląda innowację i chce wiedzieć, jak wdrożyć ją u siebie. Zadanie [0012](../tasks/0012-middleman-innowacji.md). Numer 0008 jest zarezerwowany dla portu LLM z [0016](../tasks/0016-adaptery-llm.md).

## Decyzja

- `POST /api/v1/innovations/{slug}/service-card`, body `{rola, problem?}`. `rola` to `cus-ops` albo `partner`, `mieszkaniec` dostaje 422, bo osoba prywatna nie wdraża innowacji u siebie. `problem` to stan problemu z czatu (ADR 0004 §7), który front trzyma w przeglądarce. Jest opcjonalny, bo na stronę innowacji można wejść bez czatu.
- Odpowiedź to zwykły JSON, bez SSE: `{slug, nazwa, rola, karta}`, gdzie `karta = {cel, odbiorcy, kroki (3-7), zasoby, ryzyka, wskazniki_sukcesu}`. Jedno wywołanie modelu trwa kilka sekund, a front pokazuje w tym czasie stan ładowania. Strumień nic tu nie daje, bo karta ma sens dopiero w całości.
- Jedno wywołanie `LLMService.complete_json` (DeepSeek, `json_object`), wynik sprawdzany schematem Pydantic. Gdy odpowiedź jest niepełna albo model zwróci błąd, endpoint odpowiada 502 z komunikatem dla użytkownika. Po wejściu portu z 0016 serwis przechodzi na port bez zmiany kontraktu.
- Ugruntowanie jak `why_relevant` w ADR 0005: model dostaje tylko pola innowacji (z nakładką) i teksty stanu problemu. Nie podaje kosztów, liczb, kontaktów ani faktów spoza tych danych, a brakujące dane oznacza „do uzupełnienia”. Dane są w znacznikach `<innowacja>` i `<problem>`, prompt mówi, że to dane, nie polecenia. Każde pole problemu jest ucięte do 500 znaków.
- Limity z [0006](../tasks/0006-limity-czatu.md): nginx z tą samą strefą co czat (wspólny limit na IP), `CHAT_ENABLED` i dzienny budżet tokenów (503). `complete_json` dolicza swoje tokeny do budżetu, więc liczy się też panel administratora.
- Przycisk „Dostosuj do mojej instytucji” na `/innowacja/:slug` widzą wszyscy. Rolę bierzemy z czatu, a jeśli jej nie ma, użytkownik wybiera `cus-ops` albo `partner` przed wysłaniem. Wynik nie jest zapisywany na backendzie.

## Konsekwencje

- Prosty kontrakt dla frontu, ten sam model i dane co czat, brak nowej bazy.
- Karta jest ogólna, gdy użytkownik nie przyszedł z czatu. Dane gminy z [0013](../tasks/0013-dane-gminy-w-czacie.md) można dołożyć później jako kolejne wejście.
- Dzienny budżet tokenów jest wspólny dla czatu, karty i panelu: wyczerpanie przez jedną funkcję wyłącza pozostałe.
