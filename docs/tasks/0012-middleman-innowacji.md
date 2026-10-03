# 0012. Moduł VII: Middleman innowacji

- Status: review
- Osoba: Bartosz (ADR, backend), Kacper (frontend)
- PR: #32

## Cel

Na stronie innowacji pracownik CUS/OPS albo partner (JST, NGO, ekspert) dostaje kartę usługi: jak wdrożyć tę innowację u siebie. Dodatkowy moduł wyzwania (+5%), decyzja z [0007](0007-ustalenia-otwarte.md).

## Kroki

- [x] Krótki ADR: wejście (slug innowacji, rola, opcjonalnie stan problemu z czatu trzymany w przeglądarce), wyjście (karta usługi), endpoint, odpowiedź zwykła czy strumień SSE, komu pokazujemy przycisk
- [x] Karta usługi: cel, odbiorcy, kroki wdrożenia (3–7), potrzebne zasoby, ryzyka, wskaźniki sukcesu. Brakujące dane oznaczone „do uzupełnienia”
- [x] Backend: endpoint (propozycja: `POST /api/v1/innovations/{slug}/service-card`) przez port LLM z [0016](0016-adaptery-llm.md) (`complete_json` albo jego następca), wyjście ustrukturyzowane (schemat Pydantic)
- [x] Ugruntowanie: tylko pola innowacji i stan problemu. Bez kosztów, liczb, kontaktów i faktów spoza bazy, jak `why_relevant` w ADR 0005
- [ ] Frontend: przycisk „Dostosuj do mojej instytucji” na `/innowacja/:slug`, wybór roli, jeśli nie przyszła z czatu, widok karty, wydruk
- [x] Limity z [0006](0006-limity-czatu.md) obejmują też ten endpoint
- [x] Testy backendu ze stubem modelu
- [ ] axe dla widoku karty (z frontem)

## Notatki

- Korzysta z tego samego modelu i danych co czat, więc koszt utrzymania jest niski.
- 2026-10-03: decyzje w [ADR 0009](../adr/0009-middleman-karta-uslugi.md) (proponowana, do akceptacji). Backend używa `LLMService.complete_json`, bo portu z [0016](0016-adaptery-llm.md) jeszcze nie ma. Po 0016 trzeba przepiąć serwis, kontrakt się nie zmienia.
- Kontrakt dla frontu (Kacper): `POST /api/v1/innovations/{slug}/service-card`, body `{"rola": "cus-ops" | "partner", "problem": <stan problemu z czatu> | null}`, odpowiedź `{slug, nazwa, rola, karta: {cel, odbiorcy, kroki, zasoby, ryzyka, wskazniki_sukcesu}}`. Kody błędów: 404 (brak innowacji), 422 (zła rola), 429 (nginx), 502 (model), 503 (wyłącznik albo budżet). Komunikat jest w `detail`.
- Nie sprawdzone na prawdziwym modelu.
