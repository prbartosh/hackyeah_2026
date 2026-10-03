# 0012. Moduł VII: Middleman innowacji

- Status: todo
- Osoba: Bartosz (ADR, backend), Kacper (frontend)
- PR:

## Cel

Na stronie innowacji pracownik CUS/OPS albo partner (JST, NGO, ekspert) dostaje kartę usługi: jak wdrożyć tę innowację u siebie. Dodatkowy moduł wyzwania (+5%), decyzja z [0007](0007-ustalenia-otwarte.md).

## Kroki

- [ ] Krótki ADR: wejście (slug innowacji, rola, opcjonalnie stan problemu z czatu trzymany w przeglądarce), wyjście (karta usługi), endpoint, odpowiedź zwykła czy strumień SSE, komu pokazujemy przycisk
- [ ] Karta usługi: cel, odbiorcy, kroki wdrożenia (3–7), potrzebne zasoby, ryzyka, wskaźniki sukcesu. Brakujące dane oznaczone „do uzupełnienia”
- [ ] Backend: endpoint (propozycja: `POST /api/v1/innovations/{slug}/service-card`) w `LLMService`, wyjście ustrukturyzowane (schemat Pydantic)
- [ ] Ugruntowanie: tylko pola innowacji i stan problemu. Bez kosztów, liczb, kontaktów i faktów spoza bazy, jak `why_relevant` w ADR 0005
- [ ] Frontend: przycisk „Dostosuj do mojej instytucji” na `/innowacja/:slug`, wybór roli, jeśli nie przyszła z czatu, widok karty, wydruk
- [ ] Limity z [0006](0006-limity-czatu.md) obejmują też ten endpoint
- [ ] Testy backendu ze stubem modelu, axe dla widoku karty

## Notatki

- Korzysta z tego samego modelu i danych co czat, więc koszt utrzymania jest niski.
