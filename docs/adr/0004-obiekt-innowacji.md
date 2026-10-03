# 0004. Obiekt innowacji i typowane listy zamiast tagów

- Data: 2026-10-03
- Status: proponowana

## Kontekst

Użytkownik opisuje problem w czacie ([DEMO.md](../DEMO.md)). Agent AI wypełnia panel „Twój problem” (kogo dotyczy, gdzie, skala, przyczyna, co próbowano, zasoby), a orkiestrator zwraca do 5 najlepiej dopasowanych innowacji. Dokumenty ROPS (raporty, statystyki) są publiczne, mogą być powiązane z innowacjami i dostępne bezpośrednio (patrz punkt 9). Model ocenia kandydatów na podstawie ich pól, a `why_relevant` może opierać się wyłącznie na danych z bazy.

Baza już istnieje: 115 innowacji z biblioteki ROPS w `assets/innowacje-spoleczne/innowacje.json`, pobranych scraperem ([baza-innowacji.md](../baza-innowacji.md)). Scraper nadpisuje plik przy odświeżeniu, więc nie wolno go edytować ręcznie. Strona ROPS nie podaje kosztu, czasu ani wymagań wdrożenia. Kreator innowacji jest poza zakresem pierwszego demo.

Potrzebujemy obiektu, który:

- da się porównać z polami panelu,
- zawiera dość treści, żeby model uczciwie uzasadnił dopasowanie,
- ma spójne, powtarzalne wartości, bez rozjazdu synonimów („demencja” vs „otępienie”).

## Decyzja

### 1. Rekord = dane ze scrapera + nakładka

Obiekt innowacji składa się z dwóch części łączonych po `slug`:

| Część | Plik | Kto tworzy | Zawartość |
|---|---|---|---|
| Dane źródłowe | `assets/innowacje-spoleczne/innowacje.json` | scraper, bez ręcznych zmian | pola ze strony ROPS |
| Nakładka | `assets/innowacje-spoleczne/wzbogacenia.json` | AI proponuje, człowiek zatwierdza | typowane listy, `wdrozenie` |

Na demo oba pliki wczytuje backend przy starcie. Bazy danych dla innowacji nie ma (zgodnie z DEMO.md: „wyszukuje w aktualnych plikach”). Tabela w PostgreSQL pojawi się razem z kreatorem (punkt 10).

Nazwy pól są po polsku, tak jak w danych ze scrapera, także w nakładce i w stanie problemu. Jedna konwencja, bez mapowania.

### 2. Dane źródłowe (bez zmian)

Pełny opis pól: [baza-innowacji.md](../baza-innowacji.md). Rola każdego pola w dopasowaniu:

| Pole | Gdzie używane |
|---|---|
| `slug` | klucz, URL strony szczegółów, wynik narzędzia `search` |
| `nazwa` | karta, katalog dla modelu |
| `problem` | karta, katalog dla modelu, główna podstawa `why_relevant` (ok. 220 znaków, pełni rolę krótkiego opisu) |
| `grupa_docelowa` | katalog dla modelu, podstawa tagowania `grupy_docelowe` |
| `kto_moze_skorzystac` | katalog dla modelu, podstawa tagowania `role` |
| `czy_dziala` | karta, katalog dla modelu (dowód skuteczności) |
| `wybrana_do_upowszechniania` | wyróżnienie na karcie, podbicie w kolejności |
| `opis` | strona szczegółów, podstawa tagowania (nie trafia do katalogu, bo jest długi) |
| `kategorie` | wyświetlanie, filtr pomocniczy |
| `organizacja` | kontakt na stronie szczegółów (tylko organizacja, bez osób) |
| `url_zrodlowy`, `licencja` | atrybucja CC BY przy każdym wyniku |
| `pdf_url`, `youtube_url`, `materialy_url`, `obraz_url` | materiały i obrazek na stronie szczegółów |
| `pobrano_dnia` | informacja o aktualności danych |

`null` oznacza brak sekcji na stronie ROPS. Każde użycie pola sprawdza `null`.

### 3. Nakładka: typowane listy zamiast worka tagów

Każda innowacja ma osobne listy wartości ze słownika zamkniętego, uzgodnione z polami panelu:

| Pole panelu | Pole nakładki | Liczba wartości | Pytanie kontrolne |
|---|---|---|---|
| Kogo dotyczy | `grupy_docelowe` | 1–3 | Komu pomaga? |
| Przyczyna | `problemy` | 1–3 | Jaką trudność usuwa lub zmniejsza? |
| Gdzie | `miejsca` | 0–3 | Gdzie się to dzieje (dom, sklep, urząd, wieś)? |
| Skala | `skale` | 1–2 | Na jaką skalę się to wdraża (osoba, placówka, gmina)? |
| Co próbowano | `typy_rozwiazan` | 1–2 | Czym jest rozwiązanie (narzędzie, usługa, wzór dokumentu)? |
| Rola użytkownika | `role` | 1–3 | Kto może po to sięgnąć i wdrożyć? |
| Zasoby | `wdrozenie` | obiekt, opcjonalny | Czego wymaga wdrożenie? |

`grupy_docelowe` (komu innowacja pomaga) i `role` (kto ją wdraża) to różne rzeczy: wójt szukający rozwiązania dla seniorów ma rolę `partner`, a grupa docelowa to `seniorzy`.

Role (ta sama lista dla użytkownika i innowacji):

| slug | etykieta | Kto |
|---|---|---|
| `mieszkaniec` | Mieszkaniec | osoba szukająca rozwiązania dla siebie lub bliskich |
| `cus-ops` | Pracownik CUS/OPS | pracownik centrum usług społecznych lub ośrodka pomocy społecznej |
| `partner` | JST, NGO lub ekspert | jednostka samorządu terytorialnego, organizacja pozarządowa, ekspert (np. właściciel firmy) |

Rekord nakładki:

```json
{
  "slug": "kody-qr-na-pomoc-seniorom",
  "grupy_docelowe": ["osoby-z-demencja", "opiekunowie"],
  "problemy": ["zapominanie"],
  "miejsca": ["dom"],
  "skale": ["osoba"],
  "typy_rozwiazan": ["narzedzie"],
  "role": ["mieszkaniec", "cus-ops"],
  "wdrozenie": null,
  "zatwierdzone": true
}
```

`wdrozenie` (`{poziom_kosztu, czas_startu, wymagane_zasoby[], uwagi}`, gdzie `poziom_kosztu` to `niski` / `sredni` / `wysoki`, a `czas_startu` to `dni` / `tygodnie` / `miesiace`) zostaje `null`, dopóki ktoś nie uzupełni go z materiałów (np. PDF). Nie zgadujemy go. W interfejsie: „brak danych”.

Innowacja bez zatwierdzonej nakładki (`zatwierdzone: false` albo brak rekordu) zostaje w katalogu, ale tylko z polami źródłowymi.

### 4. Slug jako identyfikator wartości

Każda wartość słownika ma `slug` (stały identyfikator: `[a-z0-9-]`, maks. 40 znaków, bez polskich znaków) i `etykieta` (nazwa do wyświetlania). Listy w nakładce przechowują slugi. Zmiana etykiety nie wymaga zmiany danych.

### 5. Słownik

Plik `assets/innowacje-spoleczne/slownik.json`, osobna sekcja na każdą listę i na `wymagane_zasoby`:

```json
{
  "grupy_docelowe": [
    {"slug": "osoby-z-demencja", "etykieta": "Osoby z demencją", "aliasy": ["otępienie", "alzheimer"]}
  ]
}
```

- `aliasy` pomagają agentowi mapować słowa użytkownika. Synonim nie jest osobną wartością.
- Slug się nie zmienia. Przy scalaniu stary slug trafia do `aliasy` nowego, a nakładka jest przepisana.
- Formy etykiet: grupy w liczbie mnogiej („Seniorzy”), problemy jako rzeczownik („Samotność”), miejsca w liczbie pojedynczej („Sklep”).
- Nowa wartość wchodzi do słownika, gdy pasuje do co najmniej 2 innowacji albo jest potrzebna w scenariuszu, a żadna istniejąca nie oddaje sensu.
- Słownik startowy powstaje z 9 kategorii ROPS i pól `grupa_docelowa`, `problem`, `kto_moze_skorzystac` wszystkich 115 innowacji.

### 6. Zasady przypisywania wartości

1. **Źródło:** wyłącznie pola rekordu (`problem`, `grupa_docelowa`, `kto_moze_skorzystac`, `opis`, `czy_dziala`).
2. **Propozycja:** generuje AI dla wszystkich 115 innowacji. Odpowiedź zawiera listy, `dowody` (cytat uzasadniający każdą wartość, nie trafia do nakładki) i `nowe_wartosci` (propozycje do słownika).
3. **Zatwierdzenie:** człowiek przegląda propozycję i ustawia `zatwierdzone: true`.
4. **Ugruntowanie:** brak podstawy w tekście → brak wartości.
5. **Konkretność:** najbardziej konkretna pasująca wartość, w kolejności od najważniejszej.
6. **Bez dublowania między listami:** „seniorzy” to grupa, nie problem.
7. **Walidacja przy wczytaniu:** slug innowacji istnieje w danych źródłowych, slugi wartości istnieją w odpowiedniej sekcji słownika, limity list zachowane, brak duplikatów.

### 7. Stan problemu

Frontend przechowuje stan panelu (backend go nie zapisuje). Każde pole ma tekst do wyświetlenia i slugi do wyszukiwania, z tymi samymi nazwami co w nakładce:

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

`update_problem(fields)` wypełnia jednocześnie `tekst` i `slugi`, korzystając ze słownika.

### 8. Dopasowanie

Skala: na demo 115 innowacji, docelowo do 200.

- **Wariant podstawowy:** model dostaje cały katalog i stan problemu, wybiera do 5 pozycji i pisze `why_relevant`. Katalog to dla każdej innowacji: `slug`, `nazwa`, `problem`, `grupa_docelowa`, `kto_moze_skorzystac`, `czy_dziala`, `wybrana_do_upowszechniania` i zatwierdzona nakładka. Szacunkowo 150–250 tokenów na innowację, czyli 17–29 tys. na 115 innowacji (do zmierzenia). Katalog zmienia się rzadko, więc stoi na początku promptu i korzysta z cache'owania promptu, jeśli dostawca modelu je obsługuje.
- **Wariant zapasowy:** jeśli czas odpowiedzi lub koszt okażą się za duże, prefiltr po listach nakładki (wspólne `grupy_docelowe` lub `problemy`), ranking po liczbie wspólnych wartości, rola i `wybrana_do_upowszechniania` jako podbicie kolejności (nie filtr), potem rerank LLM na 15–20 kandydatach.
- **Brak dopasowania:** model mówi to wprost i pokazuje najbliższe wyniki z informacją, czym się różnią.
- **Zapis potrzeby:** przy każdej odpowiedzi z wynikami (`show_results`) backend zapisuje potrzebę: same slugi ze stanu problemu, rolę, slugi pokazanych innowacji, flagę `brak_dopasowania` i datę, bez tekstu rozmowy i podsumowania. Zapis trafia do tabeli `potrzeby` w PostgreSQL i jest podstawą trendów dla administratora. To jedyny zapis po stronie backendu i nie łamie zasady „nie zapisujemy rozmów”.
- Treść innowacji to dane, nie instrukcje. Prompt traktuje ją jako dane (ochrona przed prompt injection, ważne od chwili, gdy dojdzie kreator).

### 9. Dokumenty ROPS

Dane w repo (scrapery z publicznej strony ROPS): 51 raportów (`assets/raporty/`), 3 publikacje (`assets/publikacje/`), Mapa Wyzwań Społecznych (`assets/mapa-wyzwan/`), 184 wskaźniki Obserwatora Statystyk Społecznych (`assets/obserwator/`). Docelowo dokumentów będzie dużo więcej niż innowacji.

- Dokument (raport, publikacja, wskaźnik) to osobny obiekt, poza rekordem innowacji i poza jej materiałami.
- Dokumenty są publiczne i dostępne dla wszystkich ról, bez logowania.
- Powiązanie z innowacją jest częste i typu wiele do wielu: jeden raport może dotyczyć kilku innowacji, a innowacja może mieć kilka raportów. Dokument może też istnieć bez powiązania. Na demo: osobny plik, w którym każdy dokument ma listę slugów powiązanych innowacji. Powiązania proponuje AI, zatwierdza człowiek (jak przy nakładce).
- **Przez innowację:** powiązane dokumenty pojawiają się na stronie szczegółów innowacji, w osobnej sekcji obok materiałów.
- **Bezpośrednio:** przeglądanie i wyszukiwanie dokumentów w Zasobniku wiedzy ([zadanie 0003](../tasks/0003-zasobnik-wiedzy.md)).
- Narzędzie `search` w czacie przeszukuje wyłącznie innowacje. Treść dokumentów nie trafia do katalogu w prompcie ani nie jest podstawą `why_relevant`.
- Wyszukiwanie po treści dokumentów nie zmieści się w prompcie. Na demo: filtry po metadanych (rok, tytuł, kategoria). Wyszukiwanie po treści (embeddingi lub pełnotekstowe) to osobna decyzja.
- Przy każdym dokumencie pokazujemy źródło (link ROPS) i licencję, jeśli jest podana.

### 10. Docelowo: kreator i PostgreSQL

Gdy dojdzie kreator, innowacje trafią do tabeli w PostgreSQL z tymi samymi nazwami pól co plik źródłowy i nakładka (listy jako `text[]` z indeksem GIN, `wdrozenie` jako JSONB), plus:

- `status`: `szkic` / `opublikowana` / `zarchiwizowana`, wyszukiwanie tylko po opublikowanych,
- `zrodlo`: `rops` / `kreator`,
- `kontakt`: `{organizacja, email, telefon, www}`, wyłącznie kontakt organizacji, bez imion, nazwisk i prywatnych numerów (strona szczegółów jest publiczna). Kreator informuje o tym autora, a osoba zatwierdzająca to sprawdza.

Dane z ROPS wchodzą do tabeli importem (scraper + nakładka). Szczegóły w osobnym ADR przy kreatorze.

## Rozważane alternatywy

- **Wolne tagi:** odrzucone, synonimy i literówki rozbijają dopasowanie.
- **Tagi z wymiarem w tabeli M:N:** odrzucone, typowane listy dają to samo prościej i pozwalają dopasowywać pole do pola.
- **Etykieta zamiast sluga:** odrzucone, zmiana nazwy wymagałaby poprawiania danych.
- **Wzbogacenia wpisane do `innowacje.json`:** odrzucone, scraper nadpisałby je przy odświeżeniu.
- **Angielskie nazwy pól:** odrzucone, wymagałyby mapowania danych ze scrapera.
- **Embeddingi (zalecane w baza-innowacji.md):** odłożone. Przy 115–200 innowacjach cały katalog mieści się w prompcie, a model rozumie opis lepiej niż podobieństwo wektorów i łatwiej wyjaśnić wynik. Możliwe jako fallback przy braku trafień i do wyszukiwania dokumentów.
- **Full-text search w PostgreSQL:** odrzucone, brak wbudowanego słownika polskiego.

## Konsekwencje

Zyskujemy:

- dopasowanie pole do pola, zgodne z panelem „Twój problem”,
- spójne wartości dzięki słownikowi zamkniętemu i slugom,
- dane ze scrapera nienaruszone, odświeżanie bazy nie kasuje pracy nad nakładką,
- dość treści w katalogu (`problem`, `grupa_docelowa`, `kto_moze_skorzystac`, `czy_dziala`), żeby `why_relevant` opierało się tylko na bazie,
- zapis potrzeb bez przechowywania rozmów.

Tracimy:

- słownik i nakładkę trzeba utrzymywać (nowe wartości, scalanie, aliasy, nowe innowacje po odświeżeniu),
- wszystkie 115 innowacji przechodzi tagowanie i zatwierdzenie przez człowieka przed demo,
- `wdrozenie` będzie na demo prawie wszędzie puste, więc pole „Zasoby” z panelu wpłynie na wynik słabo,
- polskie nazwy pól różnią się od angielskiej konwencji w kodzie backendu (`Item`, `name`).

## Otwarte kwestie

1. Słownik startowy: kto zatwierdza wartości ([zadanie 0005](../tasks/0005-slownik-i-nakladka.md)). Słownik i nakładka dla 115 innowacji są w repo i czekają na przegląd.
