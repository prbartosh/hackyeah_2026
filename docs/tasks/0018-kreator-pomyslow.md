# 0018. Kreator pomysłów (moduł III)

- Status: w toku
- Osoba: Kacper
- PR: #34

## Cel

Użytkownik opisuje pomysł, AI wypełnia fiszkę, użytkownik poprawia i wysyła: pomysł trafia do skrzynki panelu jako zgłoszenie. W czasie naboru generator przepisuje fiszkę pod pola wniosku (DOCX), „Znajdź finansowanie” prowadzi z karty innowacji do wniosku. Canvy innowacji i asystent dopracowania pomysłu. Decyzje: [ADR 0008](../adr/0008-kreator-pomyslow.md).

## Kroki

- [x] Rozpoznanie repo, plan, ADR 0008
- [x] Schemat, migracja `0003`, backend fiszki, naborów, wniosków, canv i asystenta
- [x] UI fiszki (krokowy formularz, autozapis, dyktowanie, wysyłka do skrzynki panelu)
- [x] Nabory, generator wniosków, eksport DOCX/tekst, ekran naborów w panelu
- [x] „Znajdź finansowanie” (karta innowacji i fiszka)
- [x] Canvy (druk, DOCX)
- [x] Asystent (braki, pytania od AI, kolejne kroki)
- [x] Seed demo, testy backendu i helperów frontendu
- [ ] Test z czytnikiem ekranu (NVDA) i axe
- [ ] Przejście z prawdziwym `LLM_API_KEY` (DeepSeek)
- [ ] Migracja `0003` na prawdziwym PostgreSQL
- [ ] Sprawdzenie szablonu canvy z oryginalnym PDF
- [x] Rate limit publicznych endpointów `/kreator/*` (nginx, tylko POST, strefa `form_req`)
- [ ] Wizualizacja pomysłu: poza zakresem, brak dostawcy obrazów

## Notatki

- Uruchomienie i demo: [kreator-pomyslow.md](../kreator-pomyslow.md).
- Wysłana fiszka i wniosek to zwykłe zgłoszenie w skrzynce panelu (bez zmian modelu `Ticket`).
- 2026-10-03: PR #34 scalony, zadanie wraca do `w toku` (zostały kroki sprawdzające). Limit POST w nginx: strefa `form_req`, 20 na minutę na IP, zapas 10, sprawdzone na obrazie frontendu (12. zapytanie z rzędu dostaje 429, PUT bez limitu).
