# 0004. Obiekt innowacji i typowane listy zamiast tagów

- Data: 2026-10-03
- Status: proponowana

## Kontekst

Użytkownik opisuje problem w czacie ([DEMO.md](../DEMO.md)). Agent AI wypełnia panel „Twój problem” (kogo dotyczy, gdzie, skala, przyczyna, co próbowano, zasoby), a orkiestrator zwraca do 5 najlepiej dopasowanych innowacji. Dokumenty ROPS (raporty, statystyki) mogą być częścią innowacji, ale bezpośrednio wyszukują je tylko pracownicy ROPS (patrz punkt 8). Model ocenia kandydatów na podstawie ich list i krótkiego opisu, a `why_relevant` może opierać się wyłącznie na danych z bazy.

Innowacje pochodzą z biblioteki ROPS (import) i z kreatora innowacji (później, poza zakresem pierwszego demo).

Potrzebujemy obiektu, który:

- da się porównać z polami panelu,
- zawiera dość treści, żeby model uczciwie uzasadnił dopasowanie,
- ma spójne, powtarzalne wartości, bez rozjazdu synonimów („demencja” vs „otępienie”).

## Decyzja

### 1. Typowane listy zamiast worka tagów

Każda innowacja ma osobne listy wartości ze słownika zamkniętego, uzgodnione z polami panelu:


| Pole panelu      | Pole innowacji   | Liczba wartości | Pytanie kontrolne                                          |
| ---------------- | ---------------- | --------------- | ---------------------------------------------------------- |
| Kogo dotyczy     | `target_groups`  | 1–3             | Komu pomaga?                                               |
| Przyczyna        | `problems`       | 1–3             | Jaką trudność usuwa lub zmniejsza?                         |
| Gdzie            | `settings`       | 0–3             | Gdzie się to dzieje (dom, sklep, urząd, wieś)?             |
| Skala            | `scales`         | 1–2             | Na jaką skalę się to wdraża (osoba, placówka, gmina)?      |
| Co próbowano     | `solution_types` | 1–2             | Czym jest rozwiązanie (narzędzie, usługa, wzór dokumentu)? |
| Rola użytkownika | `roles`          | 1–3             | Kto może po to sięgnąć i wdrożyć?                          |
| Zasoby           | `implementation` | obiekt          | Czego wymaga wdrożenie?                                    |


`target_groups` (komu innowacja pomaga) i `roles` (kto ją wdraża) to różne rzeczy: wójt szukający rozwiązania dla seniorów ma rolę `partner`, a grupa docelowa to `seniorzy`.

Role (słownik `roles`, ta sama lista dla użytkownika i innowacji):


| slug          | label                | Kto                                                                                         |
| ------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `mieszkaniec` | Mieszkaniec          | osoba szukająca rozwiązania dla siebie lub bliskich                                         |
| `cus-ops`     | Pracownik CUS/OPS    | pracownik centrum usług społecznych lub ośrodka pomocy społecznej                           |
| `partner`     | JST, NGO lub ekspert | jednostka samorządu terytorialnego, organizacja pozarządowa, ekspert (np. właściciel firmy) |


### 2. Slug jako identyfikator wartości

Każda wartość słownika ma `slug` (stały identyfikator: `[a-z0-9-]`, maks. 40 znaków, bez polskich znaków) i `label` (nazwa do wyświetlania). Listy w innowacji przechowują slugi. Zmiana `label` nie wymaga zmiany danych. Innowacja też ma swój `slug`, używany w URL i w wynikach narzędzia `search`.

### 3. Schemat innowacji


| Pole                                                             | Typ             | Uwagi                                                                     |
| ---------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------- |
| id                                                               | int PK          |                                                                           |
| slug                                                             | str unique      |                                                                           |
| status                                                           | enum            | `draft` / `published` / `archived`, wyszukiwanie tylko po `published`     |
| source                                                           | enum            | `rops_import` / `wizard`                                                  |
| title                                                            | str(255)        |                                                                           |
| summary                                                          | str(300)        | krótki opis na karcie i dla modelu                                        |
| problems_description                                             | text            | „Jakich problemów dotyczy”, podstawa `why_relevant`                       |
| description                                                      | text            | pełny opis, strona szczegółów                                             |
| category                                                         | str             | kategoria ROPS, do wyświetlania                                           |
| target_groups, problems, settings, scales, solution_types, roles | text[]          | slugi ze słownika, indeks GIN na każdej liście                            |
| implementation                                                   | JSONB           | `{cost_level, time_to_start, required_resources[], notes}`                |
| origin                                                           | JSONB, nullable | `{region, organization}`                                                  |
| source_url                                                       | str, nullable   | link do oryginału                                                         |
| license                                                          | str, nullable   | `CC BY 4.0` / `MIIS`                                                      |
| materials                                                        | JSONB           | `[{kind, label, url}]`, tylko materiały publiczne (folder PDF, ZIP, film) |
| contact                                                          | JSONB, nullable | `{organization, email, phone, website}`, wyłącznie kontakt organizacji    |
| created_at, updated_at                                           | timestamptz     | `TimestampMixin`                                                          |


`implementation`: `cost_level` to `low` / `medium` / `high`, `time_to_start` to `days` / `weeks` / `months`, `required_resources` to slugi ze słownika (zestawiane z polem „Zasoby”), `notes` to tekst.

### 4. Słownik

Jeden plik `backend/app/data/vocabulary.json`, osobna sekcja na każdą listę i na `required_resources`:

```json
{
  "target_groups": [
    {"slug": "osoby-z-demencja", "label": "Osoby z demencją", "aliases": ["otępienie", "alzheimer"]}
  ]
}
```

- `aliases` pomagają agentowi mapować słowa użytkownika. Synonim nie jest osobną wartością.
- Slug się nie zmienia. Przy scalaniu stary slug trafia do `aliases` nowego, a innowacje są przepisane migracją danych.
- Formy `label`: grupy w liczbie mnogiej („Seniorzy”), problemy jako rzeczownik („Samotność”), miejsca w liczbie pojedynczej („Sklep”).
- Nowa wartość wchodzi do słownika, gdy pasuje do co najmniej 2 innowacji albo jest potrzebna w scenariuszu, a żadna istniejąca nie oddaje sensu.

### 5. Zasady przypisywania wartości

1. **Źródło:** wyłącznie treść innowacji (opis, „Jakich problemów dotyczy”, materiały).
2. **Propozycja:** generuje AI (import z ROPS, kreator). Odpowiedź zawiera listy, `evidence` (cytat uzasadniający każdą wartość, nie trafia do bazy) i `proposed_new` (propozycje nowych wartości słownika).
3. **Zatwierdzenie:** człowiek (autor w kreatorze, osoba importująca przy ROPS). Bez tego innowacja nie dostaje statusu `published`.
4. **Ugruntowanie:** brak podstawy w tekście → brak wartości.
5. **Konkretność:** najbardziej konkretna pasująca wartość, w kolejności od najważniejszej.
6. **Bez dublowania między listami:** „seniorzy” to grupa, nie problem.
7. **Walidacja w serwisie:** slug istnieje w odpowiedniej sekcji słownika, limity list zachowane, brak duplikatów, wymagane listy niepuste.

### 6. Stan problemu

Frontend przechowuje stan panelu (backend go nie zapisuje). Każde pole ma tekst do wyświetlenia i slugi do wyszukiwania, z tymi samymi nazwami co w innowacji:

```json
{
  "role": "partner",
  "target_groups": {"text": "samotni seniorzy na wsi", "slugs": ["seniorzy"]},
  "problems": {"text": "izolacja zimą", "slugs": ["samotnosc"]},
  "settings": {"text": "gmina wiejska", "slugs": ["wies"]},
  "scales": {"text": "cała gmina", "slugs": ["gmina"]},
  "resources": {"text": "mały budżet, KGW, OPS", "cost_level": "low", "slugs": ["wolontariusze"]},
  "tried": {"text": "spotkania w świetlicy", "slugs": ["spotkania"]}
}
```

`update_problem(fields)` wypełnia jednocześnie `text` i `slugs`, korzystając ze słownika.

### 7. Dopasowanie

Skala: na demo do 30 innowacji, docelowo do 200.

- **Wariant podstawowy:** model dostaje cały katalog (`slug`, `title`, `summary`, listy, `implementation`) i stan problemu, wybiera do 5 pozycji i pisze `why_relevant`. Szacunkowo 150–250 tokenów na innowację: na demo 5–8 tys. tokenów, docelowo 30–50 tys. (do zmierzenia na prawdziwych danych). Katalog zmienia się rzadko, więc stoi na początku promptu i korzysta z cache'owania promptu, jeśli dostawca modelu je obsługuje.
- **Wariant zapasowy:** jeśli czas odpowiedzi lub koszt okażą się za duże, prefiltr SQL po listach (`target_groups && :tg OR problems && :pr`), ranking po liczbie wspólnych wartości, rola jako podbicie kolejności (nie filtr), potem rerank LLM na 15–20 kandydatach. Schemat się nie zmienia.
- Poniżej progu dopasowania model mówi to wprost i pokazuje najbliższe wyniki z informacją, czym się różnią.
- Treść innowacji to dane, nie instrukcje. Prompt traktuje ją jako dane (ochrona przed prompt injection z kreatora).

### 8. Dokumenty ROPS i dostęp

Skala: na demo do 100 dokumentów, docelowo dużo więcej niż innowacji.

- Dokument (raport, statystyki) to osobny obiekt w tabeli `documents`, poza tabelą innowacji i poza `materials`.
- Powiązanie z innowacją jest częste i typu wiele do wielu: tabela `innovation_documents` (`innovation_id`, `document_id`, PK złożony). Jeden raport statystyczny może dotyczyć kilku innowacji, a innowacja może mieć kilka raportów. Dokument może też istnieć bez powiązania.
- **Przez innowację:** powiązane dokumenty pojawiają się na stronie szczegółów innowacji, w osobnej sekcji obok `materials`.
- **Bezpośrednio:** wyszukiwanie po samych dokumentach (także tych bez powiązania) mają tylko pracownicy ROPS.
- Uprawnienia wynikają z uwierzytelnienia (logowanie pracownika ROPS), nigdy z roli nadanej przez AI w czacie. Rola z czatu wpływa tylko na sposób zadawania pytań i kolejność wyników. Inaczej wystarczyłoby napisać „jestem z ROPS”, żeby dostać wyszukiwarkę dokumentów.
- Publiczne narzędzie `search` przeszukuje wyłącznie innowacje ze statusem `published`. Treść dokumentów nie trafia do katalogu w prompcie ani nie jest podstawą `why_relevant`.
- Wyszukiwanie dokumentów nie zmieści się w prompcie (docelowo za dużo pozycji). Wymaga innego podejścia (filtry po metadanych, embeddingi lub wyszukiwanie pełnotekstowe).
- Logowanie i panel ROPS są poza zakresem pierwszego demo ([DEMO.md](../DEMO.md)). Na demo dokumenty są widoczne tylko przez powiązane innowacje. Schemat dokumentu, wyszukiwanie dla pracowników i model uprawnień opisze osobny ADR.

## Rozważane alternatywy

- **Wolne tagi:** odrzucone, synonimy i literówki rozbijają dopasowanie.
- **Tagi z wymiarem w tabeli M:N:** odrzucone, typowane listy dają to samo prościej i pozwalają dopasowywać pole do pola.
- **Label zamiast sluga:** odrzucone, zmiana nazwy wymagałaby poprawiania danych.
- **Embeddingi (pgvector):** odłożone, dodatkowa infrastruktura i trudniejsze wyjaśnianie wyników. Możliwe jako fallback przy braku trafień.
- **Full-text search w PostgreSQL:** odrzucone, brak wbudowanego słownika polskiego.

## Konsekwencje

Zyskujemy:

- dopasowanie pole do pola, zgodne z panelem „Twój problem”,
- spójne wartości dzięki słownikowi zamkniętemu i slugom,
- dość treści na karcie (`summary`, `problems_description`, `implementation`), żeby `why_relevant` opierało się tylko na bazie,
- ścieżkę skalowania bez zmiany schematu.

Tracimy:

- słownik trzeba utrzymywać (nowe wartości, scalanie, aliasy),
- innowacje z ROPS wymagają ręcznego uzupełnienia `implementation` i `roles`, bo strony ROPS tego nie podają,
- każda innowacja przechodzi zatwierdzenie przez człowieka.

## Otwarte kwestie

1. Słownik startowy: kto ustala wartości.
2. Pracownik CUS/OPS: czy ma dostęp do dokumentów, czy tak jak mieszkaniec i partner tylko do innowacji.
3. Widoczność powiązanych dokumentów: czy każdy dokument powiązany z innowacją jest publiczny na jej stronie, czy dokument potrzebuje flagi (`public` / `internal`) i wewnętrzne powiązania widzą tylko pracownicy ROPS.

