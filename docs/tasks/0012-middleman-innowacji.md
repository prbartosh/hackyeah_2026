# 0012. Moduł VII: Middleman innowacji

- Status: w toku
- Osoba: Bartosz (ADR, backend), Kacper (frontend)
- PR: #32, #37

## Cel

Na stronie innowacji pracownik CUS/OPS albo partner (JST, NGO, ekspert) dostaje kartę usługi: jak wdrożyć tę innowację u siebie. Dodatkowy moduł wyzwania (+5%), decyzja z [0007](0007-ustalenia-otwarte.md).

## Kroki

- [x] Krótki ADR: wejście (slug innowacji, rola, opcjonalnie stan problemu z czatu trzymany w przeglądarce), wyjście (karta usługi), endpoint, odpowiedź zwykła czy strumień SSE, komu pokazujemy przycisk
- [x] Karta usługi: cel, odbiorcy, kroki wdrożenia (3–7), potrzebne zasoby, ryzyka, wskaźniki sukcesu. Brakujące dane oznaczone „do uzupełnienia”
- [x] Backend: endpoint (propozycja: `POST /api/v1/innovations/{slug}/service-card`) przez port LLM z [0016](0016-adaptery-llm.md) (`complete_json` albo jego następca), wyjście ustrukturyzowane (schemat Pydantic)
- [x] Ugruntowanie: tylko pola innowacji i stan problemu. Bez kosztów, liczb, kontaktów i faktów spoza bazy, jak `why_relevant` w ADR 0005
- [x] Frontend: przycisk „Dostosuj do mojej instytucji” na `/innowacja/:slug`, wybór roli, jeśli nie przyszła z czatu, widok karty, wydruk
- [x] Limit zapytań z nginx ([0006](0006-limity-czatu.md)) obejmuje też ten endpoint
- [x] Testy backendu ze stubem modelu
- [x] axe dla widoku karty (z frontem)
- [ ] Przejście z prawdziwym `LLM_API_KEY` (DeepSeek)

## Notatki

- Korzysta z tego samego modelu i danych co czat, więc koszt utrzymania jest niski.
- 2026-10-03: decyzje w [ADR 0009](../adr/0009-middleman-karta-uslugi.md), przyjęty przez Bartosza 2026-10-03. Backend używa `LLMService.complete_json`, bo portu z [0016](0016-adaptery-llm.md) jeszcze nie ma. Po 0016 trzeba przepiąć serwis, kontrakt się nie zmienia.
- Kontrakt dla frontu (Kacper): `POST /api/v1/innovations/{slug}/service-card`, body `{"rola": "cus-ops" | "partner", "problem": <stan problemu z czatu> | null}`, odpowiedź `{slug, nazwa, rola, karta: {cel, odbiorcy, kroki, zasoby, ryzyka, wskazniki_sukcesu}}`. Kody błędów: 404 (brak innowacji), 422 (zła rola), 429 (nginx), 502 (model), 503 (model niedostępny). Komunikat jest w `detail`.
- Nie sprawdzone na prawdziwym modelu.
- 2026-10-03, front (Kacper): strona `/innowacja/:slug/wdrozenie`. Rola z czatu (`cus-ops`, `partner`) albo wybór, stan problemu z czatu wysyłany, gdy ma choć jedno pole. Punkty z „do uzupełnienia” wyróżnione ikoną i tekstem, źródło (strona ROPS) pod kartą, druk tylko karty. „Chcę to wdrożyć” wysyła kartę jako zwykłe zgłoszenie do skrzynki panelu (prefiks „[Chcę wdrożyć]”, jak w Kreatorze), autor dostaje link do wątku. axe: 0 naruszeń (karta ze stubem odpowiedzi, bez klucza). Bez klucza strona pokazuje komunikat z 503.
- Dane gminy z [0013](0013-dane-gminy-w-czacie.md) w karcie: później, po scaleniu obu PR (decyzja Bartosza).
