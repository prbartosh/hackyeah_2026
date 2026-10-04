# 0047. Szukanie w Zasobniku wiedzy

- Status: review
- Osoba: Wiktor
- PR:

## Cel

Jedno szukanie w Zasobniku obejmuje dokumenty (raporty, publikacje, Mapa Wyzwań, Social Canvas, opisy wskaźników Obserwatora) i karty innowacji, z lepszym rankingiem i synonimami ze słownika.

## Założenia

- Bez AI i bez nowych zależności: ranking BM25 po polach z wagami, indeks w pamięci jak dotąd ([0003](0003-zasobnik-wiedzy.md)).
- Dopasowanie zgłoszeń do kart (`matching.py`, TF-IDF z tagami) zostaje bez zmian: tam zapytanie to cały opis problemu, tu 1–4 słowa.
- Synonimy z `slownik.json` (etykieta i aliasy) działają jako zapytania zastępcze o wadze 0,7.

## Kroki

- [x] Ranking BM25 w `document_search.py`: rzadkie słowa ważą więcej, tytuł i opis 3×, do 2 słów wszystkie muszą pasować, dalej wolno pominąć jedno
- [x] Synonimy ze słownika (`synonym_queries`)
- [x] Karty innowacji w szukaniu (`InnovationRepository.search`, etykiety tagów liczą się do trafności)
- [x] Wskaźniki Obserwatora po opisie (bez tabel z liczbami), Social Canvas jako publikacja
- [x] Poprawione polskie znaki w tekście canvasa (`pdftotext` zamiast `pypdf`)
- [x] `GET /api/v1/search` (dokumenty i innowacje), limit w `frontend/nginx.conf`
- [x] Frontend: `ZasobnikWyzwania` szuka wspólnie, sekcja „Pasujące innowacje”
- [x] Testy backendu (257 → 266)
- [ ] Zestaw zapytań z oczekiwanymi wynikami do porównania rankingów (potrzebna lista od produktu)

## Notatki

- Pomijamy tabele wskaźników (po nazwie powiatu pasowałyby wszystkie 184 wskaźniki) i `observations.csv` z gminami (34 MB; gminy ma `ObserwatorRepository`, używa go czat).
- Ranking nie był porównywany liczbami ze starym ani z `TfidfIndex`; na 10 zapytaniach wyniki wyglądają sensownie.
- Wyniki dokumentów są w cache procesu (`lru_cache`), indeks powstaje przy pierwszym zapytaniu (ok. 1 s).
