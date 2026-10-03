# 0003. Zasobnik wiedzy (moduł II)

- Status: review
- Osoba: Bartłomiej (backend), Daniel, Kacper (frontend)
- PR: #9, #35, #42

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
- [x] `InnovationRepository`: dodać `list(kategoria, q, wybrane)` i `categories()` (z `kategorie.json`)
- [x] Service i endpointy: `GET /api/v1/innovations` (filtry: `kategoria`, `q`, `wybrane`), `GET /api/v1/categories`
- [x] Testy endpointów

Frontend: innowacje
- [x] `/zasobnik`: kafle kategorii z liczbą innowacji, wyszukiwarka tekstowa, filtr „wybrane do upowszechniania”
- [x] Karta innowacji: nazwa, kategoria, skrót problemu. Bez obrazu: `obraz_url` w sprawdzonych rekordach to kod QR do strony ROPS (ustalenie z PR #9)
- [x] Uzupełnić `/innowacja/:slug` o brakujące pola: opis, problem, grupa docelowa, kto może skorzystać, czy działa, osadzony film, PDF, ZIP, licencja i link do źródła ROPS. Puste pola zgodnie z baza-innowacji.md
- [x] Link do zasobnika w `Layout`

Backend: dokumenty
- [x] `DocumentRepository`: odczyt `metadata.json` z `assets/raporty/`, `assets/publikacje/`, `assets/mapa-wyzwan/` oraz `indicators.json` z `assets/obserwator/`
- [x] `GET /api/v1/documents` (filtry: `typ`, `rok`, `q` po tytule i opisie), `GET /api/v1/documents/{id}`
- [x] Testy endpointów

Frontend: dokumenty
- [x] Sekcja „Wyzwania Małopolski” w `/zasobnik`: lista raportów i publikacji z filtrem po roku, Mapa Wyzwań, link do PDF i źródła ROPS. Licencja tylko tam, gdzie jest (CC BY 4.0, pole `licencja` w `assets/raporty/metadata.json`), w pozostałych samo źródło i link, bez słowa „licencja” ([0014](0014-licencje-danych-rops.md))
- [x] Wskaźniki Obserwatora: lista po kategoriach, strona wskaźnika z opisem i źródłem (bez wykresów w pierwszej wersji)

Dostępność (całość)
- [ ] Nawigacja klawiaturą, `alt` dla obrazów, tytuł `iframe` z filmem, audyt axe (axe na `/zasobnik` i `/innowacja/:slug` w trzech motywach bez naruszeń, `iframe` ma tytuł, brakuje ręcznego testu klawiaturą i czytnikiem ekranu)

Później (osobne zadania)
- [ ] Powiązania dokument ↔ innowacja na stronie innowacji (ADR 0004 §9, zależy od zatwierdzonych powiązań)
- [ ] Wyszukiwanie po treści dokumentów

## Notatki

- Innowacje (PR #9): backend `GET /innovations?kategoria=&q=&wybrane=true` (lista innowacji, sort po nazwie) i `GET /categories` (`{slug, nazwa, liczba_innowacji}`), frontend `/zasobnik` i film na `/innowacja/:slug`. Wyszukiwanie `q` (`repositories/innovation_search.py`): bez wielkości liter i polskich znaków, wszystkie słowa muszą pasować, lekka odmiana (wózek → wózków, seniorów → senior), przeszukiwane są nazwa, problem, grupa docelowa, kto może skorzystać, opis i organizacja.
- Pole `organizacja` w `sciezka-motosensoryczna` zawierało nazwiska autorów. Poprawka po slugu jest w `InnovationRepository` (`CORRECTIONS`), więc działa w czacie, szczegółach i liście. Test pilnuje też, że żadna organizacja w bazie nie ma tytułów osobistych (prof., dr, mgr, inż.). Po odświeżeniu danych scraperem warto sprawdzić pozostałe rekordy.
- Pole `organizacja` może zawierać nazwisko. Tytuły osobiste wyłapuje test, ale samo nazwisko bez tytułu nie. Przed demem sprawdzić ręcznie.
- PDF-y nie są w repo (`.gitignore`: `assets/**/files/*.pdf`). Linkujemy do `url` na stronie ROPS.
- API dokumentów dla frontu: `GET /api/v1/documents?typ=raport|publikacja|mapa-wyzwan|wskaznik&rok=2024&q=...` zwraca listę bez treści, `GET /api/v1/documents/{id}` dokument z polem `tresc`. Pola: `id`, `typ`, `tytul`, `opis`, `rok`, `url_zrodlowy` (strona lub PDF na rops.krakow.pl, PDF-ów nie ma w repo), `licencja` (tylko 5 raportów CC BY 4.0), `strony`, `rozmiar` (np. „15.41 MB”, tylko raporty), `kategoria` i `zrodlo_danych` (wskaźniki). Brak wartości = `null`.
- `tresc` to tekst wyciągnięty z PDF (Markdown, strony rozdzielone `<!-- page N -->`), przy wskaźniku opis i tabela powiat × rok. Front może go pokazać jako dostępną wersję tekstową obok linku do PDF, bo PDF-y ROPS prawdopodobnie nie są dostępne dla czytników ekranu.
- 2026-10-03, front dokumentów (Kacper): działy w `/zasobnik` (linki z `aria-current`): „Innowacje”, „Wyzwania i raporty” (`?dzial=wyzwania`), „Wskaźniki” (`?dzial=wskazniki`). Wyzwania: wyróżniona Mapa Wyzwań, filtry tekst, rodzaj i rok, po 12 kart z „Pokaż więcej”. Wskaźniki: 17 kategorii jako rozwijane listy, wyszukiwanie bez polskich znaków. Strona `/dokument/:id`: wersja tekstowa z podziałem na strony, link do PDF z rozmiarem albo do Obserwatora, licencja tylko przy 5 raportach CC BY 4.0. axe 0 naruszeń na obu działach, stronie wskaźnika i raportu.
- 2026-10-04, odświeżenie frontu (bez zmian w backendzie): hero ze statystykami (innowacje, raporty, wskaźniki, powiaty), kafle kategorii z ikonami, sortowanie („Polecane przez ROPS najpierw”), karty z grupą docelową i organizacją, szkielety ładowania. Strona wskaźnika ma teraz „Dane i wykresy” (`IndicatorExplorer`): KPI (średnia, max, min, zmiana r/r), wybór roku, ranking powiatów, wykres liniowy do 5 wybranych powiatów (SVG, trzy motywy, różne style linii), tabela wszystkich danych, pobranie CSV. Dane z tabeli w `tresc` parsuje `lib/indicator.ts` (z testami). Sprawdzone na mocku API z plików `assets/`, bez Dockera. Do zrobienia: test z czytnikiem ekranu.
