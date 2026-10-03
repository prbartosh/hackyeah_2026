# 0008. Panel administratora (moduł VI)

- Status: w toku
- Osoba: Kacper (do potwierdzenia)

## Cel

Pracownik ROPS loguje się tokenem, widzi skrzynkę zgłoszeń z triażem AI i zatwierdza odpowiedź do autora, wgrywa dokument projektu i zatwierdza kartę (od razu widoczną w matchmakingu), edytuje karty i patrzy na radar trendów. Decyzje: [ADR 0006](../adr/0006-panel-administratora.md).

## Kroki

- [x] Rozpoznanie repo i ADR 0006
- [ ] Schemat, migracja, autoryzacja admina, karty w bazie z importem z JSON
- [ ] Zgłoszenia, wątek, powiadomienia, licznik czasu, triaż AI
- [ ] UI: formularz zgłoszenia, skrzynka, szczegóły ze szkicem odpowiedzi
- [ ] Upload dokumentu, przegląd i zatwierdzenie karty z embeddingiem
- [ ] Lista i edycja kart, podgląd
- [ ] Radar trendów i notatki dla ROPS
- [ ] Seed demo (dane syntetyczne), testy, poprawki dostępności

## Notatki

- `potrzeby` ([0004](0004-zapis-potrzeb.md)) nie istnieje, radar opiera się na zgłoszeniach.
