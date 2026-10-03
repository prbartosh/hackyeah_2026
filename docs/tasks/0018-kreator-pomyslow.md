# 0018. Kreator pomysłów (moduł III)

- Status: review
- Osoba: Kacper
- PR: #34, #43

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
- [ ] Rate limit publicznych endpointów `/kreator/*` (nginx)
- [ ] Wizualizacja pomysłu: poza zakresem, brak dostawcy obrazów

## Notatki

- Uruchomienie i demo: [kreator-pomyslow.md](../kreator-pomyslow.md).
- Wysłana fiszka i wniosek to zwykłe zgłoszenie w skrzynce panelu (bez zmian modelu `Ticket`).
- 2026-10-03: „Znajdź finansowanie” z karty nie tworzy już kolejnej fiszki po odświeżeniu albo powrocie z wniosku: token nowej fiszki trafia do adresu (`?fiszka=`) i do „Twoje szkice”. axe w trzech motywach na `/kreator`, `/kreator/fiszka`, `/kreator/canva` i canvie demo: 0 naruszeń (bez NVDA).
