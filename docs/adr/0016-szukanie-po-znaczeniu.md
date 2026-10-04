# 0016. Szukanie po znaczeniu w Zasobniku

- Data: 2026-10-04
- Status: przyjęta

## Kontekst

Zadanie [0049](../tasks/0049-szukanie-po-znaczeniu.md). Szukanie w Zasobniku ([0047](../tasks/0047-szukanie-zasobnika.md)) to BM25 po słowach z synonimami ze słownika. Nie znajduje dokumentu, który mówi o tym samym innymi słowami: „mąż bije żonę” nie trafia w raport o przemocy w rodzinie, „brak pieniędzy na opał” w ubóstwo energetyczne. DeepSeek nie ma API embeddingów ([ADR 0007](0007-deepseek.md)), a klucz innego dostawcy oznacza koszt i zależność od sieci na demo.

## Decyzja

- **Lokalny model:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` przez `fastembed` (ONNX na CPU, ok. 220 MB, 384 wymiary, ok. 50 języków z polskim). Bez klucza i bez kosztów, działa offline po pierwszym pobraniu. Na próbie 5 potocznych zapytań do 8 zdań trafny pierwszy wynik w 4 przypadkach, z wyraźnym odstępem od reszty (np. „mąż bije żonę”: 0,54 przemoc, 0,07 następny); `potion-multilingual-128M` (statyczny, ok. 200× szybszy) też 4, ale z małym odstępem (0,32 i 0,27), `multilingual-e5-large` (2,2 GB) za ciężki do liczenia na CPU w kontenerze.
- **Port:** `Embedder` w `services/embedder.py`, jak `LLMProvider` ([ADR 0010](0010-port-llm.md)): `fastembed` importuje tylko adapter `FastEmbedder`. Model zmienia `EMBEDDING_MODEL`, `SEMANTIC_SEARCH=false` wyłącza szukanie po znaczeniu.
- **Indeks** (`services/semantic.py`): dokument dzielony na fragmenty ok. 600 znaków w granicach strony, bez linii spisu treści, z tytułem dokumentu na początku. Pomijamy fragmenty, które nie są zdaniami: tabele liczb (poniżej 55% liter) i tekst PDF z rozjechanym kodowaniem fontu (poniżej 28% samogłosek); bez tego były podobne do każdego zapytania. Wektory są w repo: `assets/semantic/dokumenty-<skrót>.npy` (skrót modelu i tekstów), liczone skryptem `backend/scripts/build_semantic_index.py` po zmianie dokumentów. Aplikacja czyta plik z repo, a gdy go nie ma (zmienione dokumenty bez przeliczenia), liczy wektory w tle przy starcie i zapisuje w `backend/.cache/semantic/`. Model w `backend/.cache/fastembed/`. Do gotowości indeksu szukanie działa samymi słowami. Karty innowacji: wektor z nazwy, problemu, grupy docelowej i opisu, w pamięci, nowe karty liczone przy zapytaniu.
- **Wyniki w jednej liście:** BM25 (z synonimami) i podobieństwo łączone metodą Reciprocal Rank Fusion (`1 / (60 + miejsce)` z każdej listy). Próg podobieństwa (kosinus): fragment 0,48, karta 0,40. Model słabo odróżnia zapytanie spoza tematu: na 10 trafnych zapytaniach najlepszy fragment ma 0,495–0,82, na 9 spoza tematu 0,33–0,56; przy progu 0,48 przechodzą wszystkie trafne i 2 z 9 spoza tematu („przepis na sernik”, „jak naprawić rower”). Odstęp od średniej ani od 99. percentyla też ich nie rozdziela. Karty: trafne 0,47–0,49, spoza tematu do 0,35. Zapytanie z samych słów do 3 liter („AI”, „DPS”) szuka tylko po słowach: model nie zna skrótów. Dokument znaleziony tylko po znaczeniu ma `po_znaczeniu: true`, fragment z najbliższego kawałka tekstu i etykietę „Podobny temat” w interfejsie.
- Bez pgvectora: 15 tys. wektorów mieści się w pamięci (macierz `numpy`, 23 MB), mnożenie trwa milisekundy.
- `GET /documents/search` zostaje po słowach; po znaczeniu szuka `GET /search` (Zasobnik).
- **Dopasowanie zgłoszeń do kart** (`CardService.rank`: kreator, triaż w panelu, [ADR 0006](0006-panel-administratora.md)): do wyniku z tagów i TF-IDF dochodzi `0,2 × (kosinus − 0,4)` (`MEANING_WEIGHT`, `MEANING_CENTER` w `matching.py`). Na zestawie testowym (`docs/zestaw-testowy.md`, offline, bez modelu językowego) top 1 z 28 do 31/35, top 3 z 32 do 34/35, zgłoszenie spoza bazy (#28) z 0,27 do 0,22 przy progu 0,30. Wynik stabilny dla wag 0,1–0,3 i środka 0,3–0,5. Same embeddingi bez tagów: 24/35, więc zostają dodatkiem.
- **Duplikaty i radar zgłoszeń** (`TicketService._duplicates`, `RadarService`): kosinus embeddingów zamiast trigramów. Na parach z zestawu testowego (#29–36 to potoczne wersje #1, 2, 3, 7, 12, 13, 14, 17; 8 duplikatów na 630 par): `prog_duplikatow` 0,65 łapie 4/8 przy 1 fałszywym na 622 (para #5/#9, obie o bezdomności w gminie), trigramy przy dotychczasowym 0,55 łapały 0/8; `prog_klastra` 0,55 łączy 6/8. Połączenie z trigramami nie poprawiało wyniku. Nowe domyślne progi panelu: 0,65 i 0,55 (zapisane wcześniej wartości dotyczyły trigramów). Bez modelu (`SEMANTIC_SEARCH=false`, testy) zostają trigramy ze stałymi progami 0,55 i 0,30.

## Konsekwencje

- Zasobnik znajduje teksty o tym samym sensie bez wspólnych słów, także dla potocznych zapytań.
- Nowa zależność (`fastembed`, z nim `onnxruntime` i `numpy`): większy obraz backendu i ok. 220 MB modelu w cache przy pierwszym starcie (potrzebny internet raz).
- Plik wektorów w repo (22 MB) oszczędza ok. 10 minut liczenia na CPU przy starcie (14,7 tys. fragmentów); wczytanie trwa kilka sekund. Po zmianie dokumentów trzeba go przeliczyć skryptem i dodać do commita, inaczej każdy start liczy go od nowa (w tym czasie Zasobnik szuka samymi słowami).
- Proces backendu zużywa więcej pamięci (model i macierz wektorów).
- Wynik podobieństwa nie tłumaczy się sam jak trafienie słowa; dlatego etykieta przy wyniku. Zapytanie spoza tematu może dostać kilka „podobnych” dokumentów (2 z 9 w próbie). Lepiej odróżnia większy model (`multilingual-e5-large`), ale liczy ok. 10× dłużej.
