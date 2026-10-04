# 0004. Obiekt innowacji i typowane listy zamiast tagów

- Data: 2026-10-03
- Status: przyjęta

## Kontekst

Czat wypełnia panel „Twój problem” ([DEMO.md](../DEMO.md)), a dopasowanie zwraca do 5 innowacji z bazy ROPS (115 pozycji w `assets/innowacje-spoleczne/innowacje.json`, opis w [baza-innowacji.md](../baza-innowacji.md)). Scraper nadpisuje ten plik, więc nie edytujemy go ręcznie. ROPS nie podaje kosztu, czasu ani wymagań wdrożenia. Obiekt innowacji ma dać się porównać z polami panelu, mieć dość treści na uczciwe `why_relevant` i spójne wartości (bez rozjazdu synonimów).

## Decyzja

### 1. Rekord = dane ze scrapera + nakładka

Łączone po `slug`:

| Część | Plik | Kto tworzy |
|---|---|---|
| Dane źródłowe | `assets/innowacje-spoleczne/innowacje.json` | scraper, bez ręcznych zmian |
| Nakładka | `assets/innowacje-spoleczne/wzbogacenia.json` | AI proponuje, człowiek zatwierdza |

Backend wczytuje oba pliki przy starcie (bazę kart dodał [ADR 0006](0006-panel-administratora.md)). Nazwy pól są po polsku, także w nakładce i stanie problemu, bez mapowania.

### 2. Dane źródłowe

Opis pól: [baza-innowacji.md](../baza-innowacji.md). `null` = brak sekcji na stronie ROPS, każde użycie pola sprawdza `null`. Do katalogu dla modelu trafiają: `slug`, `nazwa`, `problem`, `grupa_docelowa`, `kto_moze_skorzystac`, `czy_dziala`, `wybrana_do_upowszechniania` (`opis` jest za długi). `url_zrodlowy` i `licencja` (CC BY) pokazujemy przy każdym wyniku, kontakt to tylko `organizacja`.

### 3. Nakładka: typowane listy

Wartości ze słownika zamkniętego, po jednej liście na pole panelu:

| Pole panelu | Pole nakładki | Liczba wartości |
|---|---|---|
| Kogo dotyczy | `grupy_docelowe` | 1–3 |
| Przyczyna | `problemy` | 1–3 |
| Gdzie | `miejsca` | 0–3 |
| Skala | `skale` | 1–2 |
| Co próbowano | `typy_rozwiazan` | 1–2 |
| Rola użytkownika | `role` | 1–3 |
| Zasoby | `wdrozenie` | obiekt, opcjonalny |

`grupy_docelowe` (komu pomaga) to nie `role` (kto wdraża): wójt szukający rozwiązania dla seniorów ma rolę `partner`, grupa to `seniorzy`.

Role (wspólna lista użytkownika i innowacji): `mieszkaniec` (szuka dla siebie lub bliskich), `cus-ops` (pracownik CUS/OPS), `partner` (JST, NGO, ekspert).

Rekord nakładki: `{slug, grupy_docelowe, problemy, miejsca, skale, typy_rozwiazan, role, wdrozenie, zatwierdzone}`. `wdrozenie` = `{poziom_kosztu: niski|sredni|wysoki, czas_startu: dni|tygodnie|miesiace, wymagane_zasoby[], uwagi}`; zostaje `null`, dopóki ktoś nie uzupełni go z materiałów (nie zgadujemy, w UI „brak danych”). Innowacja bez zatwierdzonej nakładki zostaje w katalogu tylko z polami źródłowymi.

### 4. Slug jako identyfikator

Wartość słownika ma `slug` (`[a-z0-9-]`, maks. 40 znaków, bez polskich znaków) i `etykieta`. Nakładka przechowuje slugi, więc zmiana etykiety nie ruszy danych.

### 5. Słownik

`assets/innowacje-spoleczne/slownik.json`: sekcja na każdą listę i na `wymagane_zasoby`, wartość = `{slug, etykieta, aliasy}`.

- `aliasy` mapują słowa użytkownika (synonim nie jest osobną wartością).
- Slug się nie zmienia. Przy scalaniu stary slug trafia do `aliasy` nowego, nakładka jest przepisana.
- Etykiety: grupy w liczbie mnogiej, problemy jako rzeczownik, miejsca w liczbie pojedynczej.
- Nowa wartość: gdy pasuje do co najmniej 2 innowacji albo jest potrzebna w scenariuszu, a żadna istniejąca nie oddaje sensu.

### 6. Zasady przypisywania wartości

1. Źródło: wyłącznie pola rekordu. Brak podstawy w tekście = brak wartości.
2. AI proponuje (`scripts/tag_innovations.py`): listy, `dowody` (cytaty, nie trafiają do nakładki) i `nowe_wartosci`. Człowiek zatwierdza (`zatwierdzone: true`).
3. Najbardziej konkretna pasująca wartość, od najważniejszej, bez dublowania między listami.
4. Walidacja przy wczytaniu: slug innowacji istnieje, slugi wartości istnieją w słowniku, limity list, brak duplikatów.

### 7. Stan problemu

Trzyma go frontend, backend nie zapisuje. Pola nazwane jak w nakładce, każde jako `{tekst, slugi}`; `zasoby` ma dodatkowo `poziom_kosztu`:

```json
{
  "rola": "partner",
  "grupy_docelowe": {"tekst": "samotni seniorzy na wsi", "slugi": ["seniorzy"]},
  "problemy": {"tekst": "izolacja zimą", "slugi": ["samotnosc"]},
  "miejsca": {"tekst": "gmina wiejska", "slugi": ["wies"]},
  "skale": {"tekst": "cała gmina", "slugi": ["gmina"]},
  "zasoby": {"tekst": "mały budżet, KGW, OPS", "poziom_kosztu": "niski", "slugi": ["wolontariusze"]},
  "proby": {"tekst": "spotkania w świetlicy", "slugi": ["spotkania"]}
}
```

### 8. Dopasowanie

- **Wariant podstawowy:** model dostaje cały katalog (stoi na początku promptu, korzysta z cache) i stan problemu, wybiera do 5 pozycji i pisze `why_relevant`. Szczegóły: [ADR 0005](0005-matchmaking-chat-llm.md).
- **Wariant zapasowy** (gdy czas lub koszt za duże): prefiltr po listach nakładki, ranking po liczbie wspólnych wartości (rola i `wybrana_do_upowszechniania` jako podbicie, nie filtr), rerank LLM na 15–20 kandydatach.
- **Brak dopasowania:** model mówi to wprost i pokazuje najbliższe wyniki z różnicami.
- **Zapis potrzeby:** przy każdym `show_results` backend zapisuje do tabeli `potrzeby` same slugi stanu problemu, rolę, slugi pokazanych innowacji, `brak_dopasowania` i datę. Bez tekstu rozmowy. To jedyny zapis po stronie backendu.
- Treść innowacji to dane, nie instrukcje (ochrona przed prompt injection).

### 9. Dokumenty ROPS

Dane w repo: raporty (`assets/raporty/`), publikacje (`assets/publikacje/`), Mapa Wyzwań Społecznych (`assets/mapa-wyzwan/`), wskaźniki Obserwatora (`assets/obserwator/`).

- Dokument to osobny obiekt, publiczny dla wszystkich ról, ze źródłem (link ROPS) i licencją, jeśli jest.
- Powiązanie z innowacją jest wiele do wielu i opcjonalne: osobny plik z listą slugów na dokument. AI proponuje, człowiek zatwierdza.
- Dostęp: sekcja na stronie innowacji oraz przeglądanie i wyszukiwanie w Zasobniku wiedzy (po metadanych: rok, tytuł, kategoria).
- Narzędzie `search` w czacie przeszukuje tylko innowacje. Treść dokumentów nie trafia do katalogu ani do `why_relevant`.

### 10. Karty w bazie

Karty innowacji są w PostgreSQL (tabela `innowacje`, [ADR 0006](0006-panel-administratora.md)): te same nazwy pól, `status` (`szkic` / `opublikowana` / `zarchiwizowana`), `zrodlo` (`rops` / `dokument` / `panel`), nakładka i `wdrozenie` jako JSON. Dane ROPS wchodzą importem przy starcie. Kontakt na kartach to wyłącznie organizacja, bez imion, nazwisk i prywatnych numerów (strona jest publiczna).

## Odrzucone alternatywy

- Wolne tagi i tagi z wymiarem w M:N: synonimy i literówki rozbijają dopasowanie, typowane listy dają to samo prościej.
- Etykieta zamiast sluga: zmiana nazwy wymagałaby poprawiania danych.
- Nakładka w `innowacje.json`: scraper nadpisałby ją przy odświeżeniu.
- Angielskie nazwy pól: wymagałyby mapowania danych ze scrapera.
- Embeddingi: przy 115–200 innowacjach katalog mieści się w prompcie, a wynik łatwiej wyjaśnić.
- Full-text search w PostgreSQL: brak wbudowanego słownika polskiego.

## Konsekwencje

- Dopasowanie pole do pola, spójne wartości, dane ze scrapera nienaruszone, `why_relevant` oparte tylko na bazie, potrzeby zapisywane bez rozmów.
- Trzeba utrzymywać słownik i nakładkę (nowe wartości, scalanie, nowe innowacje po odświeżeniu) i zatwierdzać tagowanie przez człowieka.
- `wdrozenie` jest prawie wszędzie puste, więc „Zasoby” słabo wpływa na wynik.
- Polskie nazwy pól różnią się od angielskiej konwencji w reszcie kodu backendu.
- Słownik startowy, nakładkę i powiązania dokument-innowacja zatwierdza Bartłomiej (backend).
