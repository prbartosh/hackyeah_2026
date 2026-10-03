# 0003. Zasobnik wiedzy (moduł II)

- Status: todo
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
- [ ] `/zasobnik`: kafle kategorii z liczbą innowacji, wyszukiwarka tekstowa, filtr „wybrane do upowszechniania”
- [ ] Karta innowacji: obraz, nazwa, kategoria, skrót problemu
- [ ] Uzupełnić `/innowacja/:slug` o brakujące pola: opis, problem, grupa docelowa, kto może skorzystać, czy działa, osadzony film, PDF, ZIP, licencja i link do źródła ROPS. Puste pola zgodnie z baza-innowacji.md
- [ ] Link do zasobnika w `Layout`

Backend: dokumenty
- [ ] `DocumentRepository`: odczyt `metadata.json` z `assets/raporty/`, `assets/publikacje/`, `assets/mapa-wyzwan/` oraz `indicators.json` z `assets/obserwator/`
- [ ] `GET /api/v1/documents` (filtry: `typ`, `rok`, `q` po tytule i opisie), `GET /api/v1/documents/{id}`
- [ ] Testy endpointów

Frontend: dokumenty
- [ ] Sekcja „Wyzwania Małopolski” w `/zasobnik`: lista raportów i publikacji z filtrem po roku, Mapa Wyzwań, link do PDF i źródła ROPS
- [ ] Wskaźniki Obserwatora: lista po kategoriach, strona wskaźnika z opisem i źródłem (bez wykresów w pierwszej wersji)

Dostępność (całość)
- [ ] Nawigacja klawiaturą, `alt` dla obrazów, tytuł `iframe` z filmem, audyt axe

Później (osobne zadania)
- [ ] Powiązania dokument ↔ innowacja na stronie innowacji (ADR 0004 §9, zależy od zatwierdzonych powiązań)
- [ ] Wyszukiwanie po treści dokumentów
- [ ] Trendy potrzeb dla administratora (zależy od [zadania 0004](0004-zapis-potrzeb.md) i panelu admina)

## Notatki

- Pole `organizacja` może zawierać nazwisko. Przed demem sprawdzić je ręcznie.
- PDF-y nie są w repo (`.gitignore`: `assets/**/files/*.pdf`). Linkujemy do `url` na stronie ROPS.
