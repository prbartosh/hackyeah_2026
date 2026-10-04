# 0049. Szukanie po znaczeniu

- Status: review
- Osoba: Wiktor
- PR: #94

## Cel

Zasobnik i dopasowanie zgłoszeń do kart znajdują teksty o tym samym sensie, nawet bez wspólnych słów („mąż bije żonę” → raport o przemocy w rodzinie). Decyzja: [ADR 0016](../adr/0016-szukanie-po-znaczeniu.md).

## Założenia

- Lokalny model embeddingów (fastembed, `paraphrase-multilingual-MiniLM-L12-v2`), bez klucza API; za portem `Embedder`.
- Wyniki po słowach (BM25, [0047](0047-szukanie-zasobnika.md)) zostają, podobieństwo dochodzi w tej samej liście.

## Kroki

- [x] Port `Embedder` i adapter `FastEmbedder`, ustawienia `SEMANTIC_SEARCH`, `EMBEDDING_MODEL`, `CACHE_PATH`
- [x] Indeks fragmentów dokumentów liczony w tle przy starcie, zapis w `backend/.cache/semantic/`, bez tabel liczb i krzaczków z PDF
- [x] `GET /search`: dokumenty i karty z obu list (Reciprocal Rank Fusion), `po_znaczeniu` w odpowiedzi
- [x] Frontend: etykieta „Podobny temat” przy dokumencie znalezionym po znaczeniu
- [x] Progi dobrane na prawdziwych zapytaniach (fragment 0,48, karta 0,40; 2 z 9 zapytań spoza tematu dostają „Podobny temat”), skróty („AI”) tylko po słowach
- [x] Dopasowanie zgłoszeń do kart (kreator, triaż): podobieństwo jako dodatek do tagów i TF-IDF, pomiar na zestawie testowym (top 1 28 → 31/35, top 3 32 → 34/35)
- [x] Testy z atrapą modelu (bez pobierania)
- [x] Duplikaty i radar zgłoszeń po znaczeniu, pomiar na parach z zestawu testowego (duplikaty 0/8 → 4/8 przy 1 fałszywym na 622), nowe domyślne progi panelu 0,65 i 0,55
- [x] Plik wektorów w repo (`assets/semantic/`), skrypt `scripts/build_semantic_index.py`
- [x] Sprawdzenie przez API na Dockerze: Zasobnik, kreator, duplikaty, radar
- [ ] Sprawdzenie w przeglądarce (etykieta „Podobny temat”)

## Notatki

- Liczenie indeksu: ok. 10 minut CPU. Po zmianie dokumentów w `assets/` uruchomić `python scripts/build_semantic_index.py` (z `backend/`) i dodać nowy plik z `assets/semantic/` do commita (stary skrypt usuwa).
- Model (ok. 220 MB) pobiera się przy pierwszym starcie do `backend/.cache/fastembed/` (potrzebny internet raz).
- Duplikaty w danych (`raporty/text/844-…` i `850-…`) dają dwa takie same wyniki; do poprawy u źródła ([0047](0047-szukanie-zasobnika.md)).
