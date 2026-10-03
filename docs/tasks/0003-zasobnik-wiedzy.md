# 0003. Zasobnik wiedzy (moduł II)

- Status: w toku (frontend innowacji gotowy, backend i dokumenty do zrobienia)
- Osoba: Bartłomiej (backend), Daniel, Kacper (frontend)

## Cel

Publiczny katalog wiedzy ROPS pod `/zasobnik`: Biblioteka Innowacji (przeglądanie, filtrowanie, strona innowacji z filmem i materiałami) oraz dokumenty (raporty, publikacje, Mapa Wyzwań, wskaźniki Obserwatora). To moduł II z [kryteriów](../kryteria-oceny.md), za który jest +5%. Musi spełniać WCAG 2.1 AA.

## Założenia

- Innowacje: `assets/innowacje-spoleczne/innowacje.json` (115 innowacji, 9 kategorii), format w [baza-innowacji.md](../baza-innowacji.md). Odczyt przez istniejące `InnovationRepository` (`backend/app/repositories/innovation.py`), które obsługuje też nakładkę `wzbogacenia.json`. `./assets` jest już montowane w `docker-compose.yml`.
- Endpointy w konwencji istniejącego kodu: `/api/v1/innovations`. `GET /api/v1/innovations/{slug}` już działa (używa go czat). Nie tworzymy drugiego endpointu ani repozytorium.
- Strona innowacji jest wspólna z czatem: istniejąca trasa `/innowacja/:slug` (`frontend/src/pages/InnovationPage.tsx`).
- Dokumenty są publiczne dla wszystkich ([ADR 0004](../adr/0004-obiekt-innowacji.md) §9). Dane: `assets/raporty/`, `assets/publikacje/`, `assets/mapa-wyzwan/`, `assets/obserwator/` (każdy katalog ma README z formatem).
- Bez logowania. Trendy potrzeb dla administratora nie wchodzą w zakres tego zadania.
- Docelowo dane trafią do Postgresa, więc dostęp do nich trzymamy w repozytoriach. Po zmianie źródła wymieniamy tylko repozytorium.

## Kroki

Backend: innowacje
- [ ] `InnovationRepository`: dodać `list(kategoria, q, wybrane)` i `categories()` (z `kategorie.json`)
- [ ] Service i endpointy: `GET /api/v1/innovations` (filtry: `kategoria`, `q`, `wybrane`), `GET /api/v1/categories`
- [ ] Testy endpointów

Frontend: innowacje
- [x] `/zasobnik`: kafle kategorii z liczbą innowacji, wyszukiwarka tekstowa, filtr „wybrane do upowszechniania”
- [x] Karta innowacji: nazwa, kategoria, skrót problemu. Bez obrazu: `obraz_url` w sprawdzonych rekordach to kod QR do strony ROPS (ustalenie z PR #9)
- [x] Uzupełnić `/innowacja/:slug` o brakujące pola: opis, problem, grupa docelowa, kto może skorzystać, czy działa, osadzony film, PDF, ZIP, licencja i link do źródła ROPS. Puste pola zgodnie z baza-innowacji.md
- [x] Link do zasobnika w `Layout`

Backend: dokumenty
- [ ] `DocumentRepository`: odczyt `metadata.json` z `assets/raporty/`, `assets/publikacje/`, `assets/mapa-wyzwan/` oraz `indicators.json` z `assets/obserwator/`
- [ ] `GET /api/v1/documents` (filtry: `typ`, `rok`, `q` po tytule i opisie), `GET /api/v1/documents/{id}`
- [ ] Testy endpointów

Frontend: dokumenty
- [ ] Sekcja „Wyzwania Małopolski” w `/zasobnik`: lista raportów i publikacji z filtrem po roku, Mapa Wyzwań, link do PDF i źródła ROPS
- [ ] Wskaźniki Obserwatora: lista po kategoriach, strona wskaźnika z opisem i źródłem (bez wykresów w pierwszej wersji)

Dostępność (całość)
- [ ] Nawigacja klawiaturą, `alt` dla obrazów, tytuł `iframe` z filmem, audyt axe (axe na `/zasobnik` i `/innowacja/:slug` w trzech motywach bez naruszeń, `iframe` ma tytuł, brakuje ręcznego testu klawiaturą i czytnikiem ekranu)

Później (osobne zadania)
- [ ] Powiązania dokument ↔ innowacja na stronie innowacji (ADR 0004 §9, zależy od zatwierdzonych powiązań)
- [ ] Wyszukiwanie po treści dokumentów
- [ ] Trendy potrzeb dla administratora (zależy od [zadania 0004](0004-zapis-potrzeb.md) i panelu admina)

## Notatki

- Frontend (PR #9): `/zasobnik` i film na `/innowacja/:slug`. Lista i kategorie wołają `GET /innovations?kategoria=&q=&wybrane=true` (tablica innowacji) i `GET /categories` (tablica `{slug, nazwa, liczba_innowacji}`). Front nie ma lokalnego fallbacku (po #12 dane idą tylko przez API), więc `/zasobnik` pokaże komunikat o błędzie z przyciskiem ponowienia, dopóki backend nie doda tych endpointów. Oczekiwane zachowanie `q`: filtr `q` bez wielkości liter i polskich znaków, wszystkie słowa muszą pasować, lekka odmiana (wózek → wózków), kolejność po nazwie.
- Pole `organizacja` w `sciezka-motosensoryczna` zawiera nazwiska autorów. Front tego nie poprawia, poprawka ma być w backendzie (`InnovationRepository`, np. po slugu albo przez nakładkę). Do tego czasu nazwiska widać na stronie innowacji i w wynikach czatu.
- Pole `organizacja` może zawierać nazwisko. Przed demem sprawdzić je ręcznie.
- PDF-y nie są w repo (`.gitignore`: `assets/**/files/*.pdf`). Linkujemy do `url` na stronie ROPS.
