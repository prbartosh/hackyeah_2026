# 0015. Panel administratora (moduł VI)

- Status: w toku
- Osoba: Kacper (do potwierdzenia)
- PR: #19

## Cel

Pracownik ROPS loguje się tokenem, widzi skrzynkę zgłoszeń z triażem AI i zatwierdza odpowiedź do autora, wgrywa dokument projektu i zatwierdza kartę (od razu widoczną w matchmakingu), edytuje karty i patrzy na radar trendów. Decyzje: [ADR 0006](../adr/0006-panel-administratora.md), uruchomienie i demo: [panel-administratora.md](../panel-administratora.md).

## Kroki

- [x] Rozpoznanie repo i ADR 0006
- [x] Schemat, migracja `0002`, autoryzacja admina, karty w bazie z importem z JSON
- [x] Zgłoszenia, wątek, powiadomienia, licznik czasu, triaż AI
- [x] UI: formularz zgłoszenia, skrzynka, szczegóły ze szkicem odpowiedzi
- [x] Upload dokumentu, przegląd i zatwierdzenie karty z embeddingiem
- [x] Lista i edycja kart, podgląd
- [x] Radar trendów i notatki dla ROPS
- [x] Seed demo (dane syntetyczne), testy backendu (autoryzacja, triaż, zatwierdzenie karty z embeddingiem, import, radar)
- [ ] Test z czytnikiem ekranu (NVDA) i przejście całej ścieżki z prawdziwym `OPENAI_API_KEY`
- [ ] Migracja `0002` na prawdziwym PostgreSQL (sprawdzona na SQLite i jako SQL dla Postgresa)
- [ ] Limit zapytań dla publicznego `POST /zgloszenia`
- [ ] Testy frontendu (po wejściu vitest do `main`)
- [ ] Link „Zgłoś potrzebę” w nawigacji i na ekranie wyników czatu (dziś tylko stopka, żeby nie ruszać Header i ResultsSection)

## Notatki

- `potrzeby` ([0004](0004-zapis-potrzeb.md)) nie istnieje, radar opiera się na zgłoszeniach z panelu.
- Zmiany we wspólnym kodzie: `InnovationRepository` (migawka kart z bazy), `LLMService` (`embed`, `complete_json`), `main.py` (lifespan), `deps.py`, `router.py`, `Layout.tsx` (linki w stopce), `App.tsx` (trasy).
