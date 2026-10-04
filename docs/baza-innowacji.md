# Baza innowacji społecznych: jak z niej korzystać

Baza to pliki JSON w `assets/innowacje-spoleczne/` (115 innowacji z Biblioteki Innowacji Społecznych ROPS Kraków). To jedyne źródło wyników dopasowania. AI niczego do niej nie dopisuje. Nakładka i słownik: [README katalogu](../assets/innowacje-spoleczne/README.md).

Źródło i licencja: https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie, treści na licencji CC BY 4.0. Przy każdej innowacji pokazujemy `url_zrodlowy`.

## Pliki

| Plik | Zawartość |
|---|---|
| `assets/innowacje-spoleczne/innowacje.json` | Lista 115 rekordów, po jednym na innowację. |
| `assets/innowacje-spoleczne/kategorie.json` | 9 kategorii z liczbą innowacji i listą ich slugów. |
| `assets/innowacje-spoleczne/slownik.json`, `wzbogacenia.json` | Słownik i nakładka. |

Pliki są w UTF-8, otwieraj je z jawnym kodowaniem.

## Rekord innowacji

| Pole | Typ | Znaczenie | Puste (z 115) |
|---|---|---|---|
| `slug` | tekst | Unikalny identyfikator, np. `merkury`. Używaj go jako klucza. | 0 |
| `url_zrodlowy` | tekst | Strona innowacji u ROPS. Pokazuj jako źródło. | 0 |
| `nazwa` | tekst | Nazwa innowacji. | 0 |
| `kategorie` | lista | Slugi kategorii (aktualnie zawsze jedna). | 0 |
| `wybrana_do_upowszechniania` | bool | ROPS wybrał ją do upowszechniania. Można użyć do rankingu lub „poziomu dowodu". | 0 |
| `opis` | tekst | „Na czym polega rozwiązanie?" | 2 |
| `problem` | tekst | „Jakich problemów dotyczy innowacja?" To główne pole do dopasowania. | 0 |
| `grupa_docelowa` | tekst | Kogo dotyczy problem. | 1 |
| `kto_moze_skorzystac` | tekst | Jakie instytucje mogą wdrożyć (szkoły, MOPS-y, NGO). | 0 |
| `czy_dziala` | tekst | Ocena skuteczności ze strony ROPS. | 4 |
| `organizacja` | tekst lub null | Organizacja-autor. Nazwisk osób celowo nie zapisujemy. | 52 |
| `pdf_url` | tekst lub null | Folder/opis w PDF. | 82 |
| `youtube_url` | tekst lub null | Film. | 89 |
| `materialy_url` | tekst | Archiwum z materiałami (zip). Nie sprawdzaliśmy, czy każdy link działa. | 0 |
| `obraz_url` | tekst | Obrazek/ikona innowacji. | 0 |
| `licencja` | tekst lub null | Link do licencji CC BY. | 15 |
| `pobrano_dnia` | data | Kiedy dane pobrano (RRRR-MM-DD). | 0 |

Brak w bazie: kosztu, czasu wdrożenia i wymagań (strona ROPS ich nie podaje). Nie wymyślaj ich, pokazuj „brak danych”.

`null` oznacza, że sekcji nie ma na stronie źródłowej. Sprawdzaj `null` przed użyciem pola.

## Kategorie

| Slug | Nazwa | Innowacji |
|---|---|---|
| `dla-cudzoziemcow` | Dla cudzoziemców | 6 |
| `dla-dzieci-mlodziezy-i-rodziny` | Dla dzieci, młodzieży i rodziny | 21 |
| `dla-osob-o-ograniczonej-mobilnosci` | Dla osób o ograniczonej mobilności | 18 |
| `dla-osob-w-kryzysie-bezdomnosci` | Dla osób w kryzysie bezdomności | 2 |
| `dla-osob-z-niepelnosprawnoscia-intelektualna` | Dla osób z niepełnosprawnością intelektualną | 14 |
| `dla-osob-z-niepelnosprawnoscia-sensoryczna` | Dla osób z niepełnosprawnością sensoryczną | 20 |
| `dla-rynku-pracy` | Dla rynku pracy | 5 |
| `dla-seniorow` | Dla seniorów | 20 |
| `dla-zdrowia-i-medycyny` | Dla zdrowia i medycyny | 9 |

Rekord w `kategorie.json` ma pola `slug`, `nazwa`, `url_zrodlowy`, `liczba_innowacji` i `innowacje` (lista slugów). Źródłem prawdy jest plik.

## Przykłady użycia

### Python

```python
import json
from pathlib import Path

ROOT = Path("assets/innowacje-spoleczne")
innowacje = json.loads((ROOT / "innowacje.json").read_text(encoding="utf-8"))
kategorie = json.loads((ROOT / "kategorie.json").read_text(encoding="utf-8"))

po_slugu = {r["slug"]: r for r in innowacje}
merkury = po_slugu["merkury"]

seniorzy = [r for r in innowacje if "dla-seniorow" in r["kategorie"]]
wybrane = [r for r in innowacje if r["wybrana_do_upowszechniania"]]
```

### TypeScript

```ts
import innowacje from "../../assets/innowacje-spoleczne/innowacje.json";

type Innowacja = (typeof innowacje)[number];
const poSlugu = new Map(innowacje.map((r) => [r.slug, r]));
```

Pola mogą być `null`, typuj je jako `string | null`.

## Dopasowanie problemu do innowacji

Czat dostaje katalog innowacji w prompcie i wybiera z niego wyniki. Panel ROPS dopasowuje zgłoszenia do kart po tagach, słowach i znaczeniu.

- Pole `problem` ma największą wagę. Pomiń `null`.
- Kategoria to filtr pomocniczy, nie warunek konieczny.
- Przy każdym wyniku pokazuj `nazwa` i `url_zrodlowy`. Uzasadnienie AI opiera się tylko na polach rekordu.
- Gdy nic nie pasuje, zapisz potrzebę zamiast „brak wyników”.
- Trafność mierzy `backend/scripts/eval_matchmaking.py` na [zestawie testowym](zestaw-testowy.md).

## Odświeżanie danych

Z katalogu `backend/`:

```bash
python scripts/scrape_rops.py            # używa cache HTML
python scripts/scrape_rops.py --refresh  # pobiera wszystko od nowa
```

Skrypt nadpisuje oba pliki JSON i wypisuje liczbę rekordów oraz rekordy z brakami. Zależności są w `backend/pyproject.toml`. Testy parsera: `python -m pytest tests/test_scrape_rops.py --noconftest`. Duża zmiana liczby rekordów w `git diff --stat` oznacza zmianę strony ROPS.

## Zasady

- Nie edytuj JSON-ów ręcznie, zmiany zniknęłyby przy odświeżeniu. Poprawki rób w scraperze lub nakładce.
- Wzbogacenia (np. koszt, czas) trzymaj w osobnym pliku, zatwierdzane przez człowieka.
- `organizacja` jest wykrywana po słowach kluczowych i może zawierać nazwisko. Sprawdź ręcznie przed pokazem.
- Atrybucja CC BY jest wymagana.
