# 0003. Zasobnik wiedzy (moduł II)

- Status: w toku
- Osoba: Bartłomiej, Daniel, Kacper
- PR: #9, #35, #42, #46

## Cel

Publiczny katalog wiedzy ROPS pod `/zasobnik`: Biblioteka Innowacji (przeglądanie, filtrowanie, strona innowacji) oraz dokumenty (raporty, publikacje, Mapa Wyzwań, wskaźniki Obserwatora). Moduł II z [kryteriów](../kryteria-oceny.md), WCAG 2.1 AA.

## Założenia

- Innowacje: `assets/innowacje-spoleczne/innowacje.json`, format w [baza-innowacji.md](../baza-innowacji.md). Odczyt przez `InnovationRepository` (z nakładką `wzbogacenia.json`), endpointy `/api/v1/innovations`.
- Strona innowacji `/innowacja/:slug` jest wspólna z czatem (`InnovationPage.tsx`).
- Dokumenty są publiczne ([ADR 0004](../adr/0004-obiekt-innowacji.md) §9): `assets/raporty/`, `assets/publikacje/`, `assets/mapa-wyzwan/`, `assets/obserwator/` (README z formatem w każdym katalogu).
- Bez logowania. Dostęp do danych tylko przez repozytoria.

## Kroki

- [x] Backend innowacji: `list(kategoria, q, wybrane)`, `categories()`, `GET /innovations`, `GET /categories`, testy
- [x] Frontend innowacji: `/zasobnik` (kategorie, wyszukiwarka, filtr „wybrane”), karta bez obrazu, pełna strona `/innowacja/:slug`, link w `Layout`
- [x] Backend dokumentów: `DocumentRepository`, `GET /documents` (`typ`, `rok`, `q`), `GET /documents/{id}`, testy
- [x] Frontend dokumentów: „Wyzwania i raporty”, „Wskaźniki”, `/dokument/:id`; licencja tylko tam, gdzie jest (CC BY 4.0 przy 5 raportach)
- [x] axe: `/zasobnik` i `/innowacja/:slug` w trzech motywach bez naruszeń
- [ ] Ręczny test klawiaturą i czytnikiem ekranu (razem z 0022)
- [ ] Powiązania dokument ↔ innowacja na stronie innowacji (ADR 0004 §9, zależy od zatwierdzonych powiązań)
- [ ] Wyszukiwanie po treści dokumentów

## Notatki

- API dokumentów: `GET /documents?typ=raport|publikacja|mapa-wyzwan|wskaznik&rok=&q=` zwraca listę bez treści, `GET /documents/{id}` dodaje `tresc` (Markdown z PDF, strony rozdzielone `<!-- page N -->`; przy wskaźniku opis i tabela powiat × rok). Brak wartości = `null`.
- PDF-ów nie ma w repo (`.gitignore`), linkujemy do `url_zrodlowy` na stronie ROPS. Wersja tekstowa jest dostępną alternatywą dla PDF-ów bez znaczników.
- Wyszukiwanie `q` (`repositories/innovation_search.py`): bez wielkości liter i polskich znaków, wszystkie słowa muszą pasować, lekka odmiana.
- Pole `organizacja` bywa nazwiskiem autora. Poprawki po slugu w `InnovationRepository` (`CORRECTIONS`), test łapie tylko tytuły osobiste (prof., dr, mgr, inż.). Po odświeżeniu danych scraperem i przed demem sprawdzić ręcznie.
- Wskaźniki: `IndicatorExplorer` (KPI, ranking, wykres SVG, tabela, CSV; parser `lib/indicator.ts`) i kartogram `IndicatorMap` (granice z `ppatrzyk/polska-geojson`). Do sprawdzenia licencja granic (repo bez jawnej licencji, dane z PRG) przed publicznym wdrożeniem.
- Czytnik raportów: `lib/reportText.ts` porządkuje tekst z PDF (test na wszystkich 51 raportach); starsze raporty z nagłówkami małymi literami dostają mniej nagłówków.
- Mapa Wyzwań: `MapaWyzwanDocument` i `lib/mapaWyzwan.ts`. Podział kolumn person to ręczna tabela `PERSONA_PODZIAL`, zależna od układu jednego pliku; przy niezgodności parser zwraca null i działa zwykły czytnik.
