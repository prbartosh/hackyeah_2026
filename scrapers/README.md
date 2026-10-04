# scrapers – ROPS Kraków data scrapers

Python scripts that download and structure public data from the Regionalny Ośrodek Polityki Społecznej w Krakowie (ROPS). Output goes to `../assets/<site>/`; each of those folders has its own `README.md` describing the data.

The "Biblioteka innowacji społecznych" section of the ROPS site is **not** covered here; someone else handles it.

## Setup

```bash
pip install -r scrapers/requirements.txt   # requests, beautifulsoup4, pymupdf
python scrapers/run_all.py                 # everything, or run one script below
```

Python 3.10+. No browser is needed: every page used here is server-rendered.

## Scripts

| Script | Source | Output |
|---|---|---|
| `raporty.py` | `rops.krakow.pl/badania-analizy-raporty/raporty-z-badan` (51 report PDFs) | `assets/raporty/` |
| `publikacje.py` | `rops.krakow.pl/innowacje-spoleczne/publikacje-ze-swiata-innowacji` (3 PDFs, plus the Social Canvas) | `assets/publikacje/`, `assets/canvas/` |
| `mapa_wyzwan.py` | Mapa Wyzwań Społecznych PDF | `assets/mapa-wyzwan/` |
| `obserwator.py` | `obserwator.rops.krakow.pl` (184 indicators, 2007–2024, powiat + gmina) | `assets/obserwator/` |
| `common.py` | Shared helpers (not run directly) | – |
| `run_all.py` | Runs raporty, publikacje, mapa_wyzwan, obserwator in turn | – |

`obserwator.py [N]` accepts an optional number to limit the run to the first N indicators (useful for testing). A limited run may update the corresponding `data/<id>.csv` files, but deliberately leaves the global `indicators.json`, `observations.csv` and generated Markdown unchanged.

## How they work

- **PDF sources** (`raporty`, `publikacje`, `mapa_wyzwan`): read the listing page, download each PDF to `files/`, extract text with PyMuPDF to `text/*.md` (pages separated by `<!-- page N -->`), and write `metadata.json`. In `raporty`, the `/pliki-do-pobrania/wpis,<slug>,<id>` link returns the PDF directly.
- **Obserwator**: the home page menu gives the indicator list (`/differenceanalysis/<id>`). For each indicator and each year in its dropdown, the script POSTs the form (`differenceanalysis[year]`, `differenceanalysis[regions]=-1` for the whole voivodeship). The response contains a table of all powiats, and each powiat row has its gminas as hidden child tables. Everything is parsed into `data/<id>.csv`, then merged into `observations.csv` and rendered into one markdown file per indicator.
- **Resumable and idempotent:** existing PDFs and text files are skipped. Obserwator skips only CSVs containing at least one data row; a header-only file is retried and a response with no validated rows is not cached as success. Delete a complete file to refetch it. CSVs are written to a `.tmp` file first and renamed, so an interrupted run never leaves a partial CSV.

## Conventions

- All requests go through `common.get()`: browser-like User-Agent, retries with backoff (4 attempts), 0.5 s pause after each request. Errors are raised after the retries, so a failed request is never silently turned into "no data".
- `obserwator.py` runs 8 worker threads (`WORKERS`), one indicator per worker. Keep the delay and worker count modest; this is a public institution's server.
- Paths stored in `metadata.json` are relative to the repo root with forward slashes.
- PDFs (`assets/*/files/*.pdf`) are not committed (too large for git). Each `metadata.json` entry keeps the original `url`; run the scraper to get them locally under `file`.
- Console output on Windows may show broken Polish characters; set `PYTHONIOENCODING=utf-8`. The files themselves are UTF-8.

## Gotchas

- The sites return **HTTP 403** to the default `requests`/WebFetch user agent but work with a browser User-Agent (set in `common.py`).
- 32 Obserwator indicators are listed in the menu but had no data during the original import (listed in `assets/obserwator/README.md`). Header-only CSVs from that import are treated as incomplete and checked again; a newly empty response is not persisted as a successful cache. Indicators 172–174 have no year dropdown either, but the scraper recovers them (2010–2012) from the powiat-portrait endpoint `/portrait/ajax/district/1/year/<y>/pointer/<id>`.
- The English "Guide to social innovations (MIIS)" PDF on the publications page is not picked up, because `publikacje.py` reads only the table of publications.
- PDF text extraction flattens tables and loses graphics. The Social Canvas text is badly garbled.
- Adding a new source: write a `<name>.py` with a `main()`, save under `assets/<name>/` with `files/`, `text/`, `metadata.json` and a `README.md`, and add it to `run_all.py`.
