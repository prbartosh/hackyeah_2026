# Baza innowacji społecznych (ROPS)

Źródło: Biblioteka Innowacji Społecznych ROPS Kraków
(https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie),
treści na licencji CC BY 4.0. Przy każdym rekordzie jest `url_zrodlowy`.

- `innowacje.json`: 115 innowacji. Pola: `slug, url_zrodlowy, nazwa, kategorie[], wybrana_do_upowszechniania, opis, problem, grupa_docelowa, kto_moze_skorzystac, czy_dziala, organizacja, pdf_url, youtube_url, materialy_url, obraz_url, licencja, pobrano_dnia`.
- `kategorie.json`: 9 kategorii z listą slugów innowacji.
- `slownik.json`: słownik zamknięty typowanych list (`grupy_docelowe`, `problemy`, `miejsca`, `skale`, `typy_rozwiazan`, `role`, `wymagane_zasoby`), wartości `{slug, etykieta, aliasy}` ([ADR 0004](../../docs/adr/0004-obiekt-innowacji.md) §5). Edytowany ręcznie.
- `wzbogacenia.json`: nakładka, czyli typowane listy dla każdej innowacji (ADR 0004 §3). Scraper jej nie nadpisuje. Nowe innowacje taguje `python scripts/tag_innovations.py` (z `backend/`).

Pole `null` oznacza brak sekcji na stronie źródłowej (np. `opis` w `teleasystent`). Strona nie podaje kosztu, czasu ani wymagań wdrożenia, więc tych pól nie ma.
Nazwisk autorów nie zapisujemy. `organizacja` jest wykrywana heurystycznie (słowa kluczowe) i może zawierać dopisek z nazwiskiem w kilku rekordach.

Pełna dokumentacja: [docs/baza-innowacji.md](../../docs/baza-innowacji.md).

Odświeżenie danych (z `backend/`):

```bash
python scripts/scrape_rops.py --refresh
```
