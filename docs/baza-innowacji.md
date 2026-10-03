# Baza innowacji społecznych: jak z niej korzystać

Baza to dwa pliki JSON w `assets/innowacje-spoleczne/`. Zawierają 115 innowacji z Biblioteki Innowacji Społecznych ROPS Kraków. To jedyne źródło rozwiązań, do których dopasowujemy problemy użytkowników. AI niczego do niej nie dopisuje.

Źródło i licencja: https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie, treści na licencji CC BY 4.0. Przy każdej innowacji pokazujemy `url_zrodlowy`.

## Pliki

| Plik | Zawartość |
|---|---|
| `assets/innowacje-spoleczne/innowacje.json` | Lista 115 rekordów, po jednym na innowację. |
| `assets/innowacje-spoleczne/kategorie.json` | 9 kategorii z liczbą innowacji i listą ich slugów. |
| `assets/innowacje-spoleczne/.cache/` | Surowy HTML ze scrapera. Poza gitem, nie korzystaj z niego. |

Pliki są kodowane w UTF-8. Otwieraj je z jawnym kodowaniem, bo na Windowsie domyślne bywa złe.

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

Czego w bazie nie ma: kosztu wdrożenia, czasu wdrożenia i wymagań. Strona ROPS ich nie podaje. Nie wymyślaj ich. Mogą być w PDF-ach, ale tego nie wyciągaliśmy. Do czasu uzupełnienia pokazuj w interfejsie „brak danych".

`null` oznacza, że sekcji nie ma na stronie źródłowej, a nie że scraper zawiódł. Zawsze sprawdzaj `null` przed użyciem pola.

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

Rekord w `kategorie.json` ma pola `slug`, `nazwa`, `url_zrodlowy`, `liczba_innowacji` i `innowacje` (lista slugów). Nazwy w tabeli mogą różnić się o wielkość liter od pliku. Źródłem prawdy jest plik.

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

Do importu JSON-a w Vite wystarczy `"resolveJsonModule": true` w `tsconfig`. Plik ma około 0,3 MB, więc można go zaimportować wprost, bez API. Uwaga: pola mogą być `null`, więc typuj je jako `string | null`.

## Dopasowanie problemu do innowacji (wskazówki)

Decyzja o sposobie dopasowania, nakładce z typowanymi listami (`wzbogacenia.json`) i zapisie potrzeb jest w [ADR 0004](adr/0004-obiekt-innowacji.md). Na demo cały katalog trafia do promptu, embeddingi są odłożone. Wskazówki poniżej zostają jako tło.

- **Tekst do embeddingów.** Dla każdej innowacji sklej `nazwa`, `problem`, `grupa_docelowa`, `kto_moze_skorzystac` i `opis`. Pole `problem` ma największą wagę, bo użytkownik opisuje właśnie problem. Pomiń `null`.
- **Kategoria jako filtr pomocniczy.** Może zawęzić wyniki (np. seniorzy), ale nie rób z niej warunku koniecznego. Zgłoszenia bywają potoczne i niejednoznaczne.
- **Źródło przy każdym wyniku.** Pokazuj `nazwa`, `url_zrodlowy` i fragment, na którym oparto uzasadnienie. Uzasadnienie generowane przez AI może się opierać tylko na polach rekordu.
- **Brak trafienia.** Gdy nic nie pasuje, zapisz potrzebę zamiast pokazywać „brak wyników" (zasada z briefu).
- **Ocena trafności.** Przygotuj 20–30 testowych zgłoszeń z oczekiwanym `slug` i policz, ile razy trafna innowacja jest w top-3. Nie podawaj liczb, których nie zmierzyliśmy.

## Odświeżanie danych

Z katalogu `backend/`:

```bash
python scripts/scrape_rops.py            # używa cache HTML
python scripts/scrape_rops.py --refresh  # pobiera wszystko od nowa
```

Skrypt nadpisuje oba pliki JSON i wypisuje w konsoli liczbę rekordów oraz rekordy z brakami. Zależności (`httpx`, `beautifulsoup4`) są w `backend/pyproject.toml`. Testy parsera: `python -m pytest tests/test_scrape_rops.py --noconftest`.

Po odświeżeniu zerknij na `git diff --stat`. Duża zmiana liczby rekordów oznacza, że ROPS zmienił stronę lub szablon, i parser trzeba poprawić.

## Dobre praktyki i ograniczenia

- Nie edytuj JSON-ów ręcznie. Zmiany zniknęłyby przy odświeżeniu. Poprawki rób w scraperze albo dodaj osobny plik nakładki (np. `poprawki.json` po `slug`).
- Nie dopisuj do rekordów danych zmyślonych przez AI. Wzbogacenia (koszt, czas) trzymaj w osobnym pliku z oznaczeniem „do zatwierdzenia przez człowieka".
- Pole `organizacja` jest wykrywane po słowach kluczowych. W kilku rekordach może zawierać dopisek z nazwiskiem. Przed pokazaniem jury sprawdź je ręcznie.
- Dane są publiczne, ale ich użycie wymaga zachowania atrybucji (CC BY). Przed produkcyjnym wdrożeniem uzgodnij zgodę z ROPS.
