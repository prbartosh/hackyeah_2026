# publikacje – "Publikacje ze świata innowacji"

Publications about social innovation incubated by ROPS Kraków projects. Language: Polish.

- **Source:** <https://rops.krakow.pl/innowacje-spoleczne/publikacje-ze-swiata-innowacji>
- **Scraped:** 2026-10-03 with `scrapers/publikacje.py` (the same script also produces `../canvas/`).

## Contents (3 publications)

| Year | Title | Pages |
|---|---|---|
| 2023 | Połącz kropki, czyli o sile innowacji społecznych w obszarze włączenia społecznego (project "Inkubator Włączenia Społecznego") | 29 |
| 2022 | Innowacje społeczne dla dostępności (project "Inkubator Dostępności") | see `metadata.json` |
| 2019 | Przewodnik po innowacjach społecznych (project "Małopolski Inkubator Innowacji Społecznych") | see `metadata.json` |

**Not included:**
- The English "Guide to social innovations (MIIS)" PDF, linked elsewhere on the page.
- The "Biblioteka innowacji społecznych" (a different site section, assigned to someone else).
- The Social Canvas, which is in `../canvas/`.

## Licence

Unknown. Neither the listing page nor the extracted PDF text states a licence (checked 2026-10-03). Show the source and link only.

## Layout

| Path | What it is |
|---|---|
| `metadata.json` | One record per publication: `title`, `year`, `description`, `url`, `file`, `text`, `pages`. Paths are relative to the repo root, forward slashes. |
| `files/<slug>.pdf` | Original PDFs. |
| `text/<slug>.md` | Extracted text, pages separated by `<!-- page N -->`. |

Text comes from PyMuPDF, so layout, tables and graphics are flattened or lost; use the PDF for exact content. Re-run with `python scrapers/publikacje.py`.
