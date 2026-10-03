# raporty – ROPS research reports ("Raporty z badań")

51 research and analysis reports published by the Regionalny Ośrodek Polityki Społecznej (ROPS) w Krakowie, years 2010–2026. Topics: social services and deinstitutionalisation, care homes (DPS), foster care, family support, social economy, domestic violence, NGOs, evaluation, diagnoses for regional plans. Language: Polish. Some are licensed CC BY 4.0 (stated in the description).

- **Source:** <https://rops.krakow.pl/badania-analizy-raporty/raporty-z-badan>
- **Scraped:** 2026-10-03 with `scrapers/raporty.py`.

## Layout

| Path | What it is |
|---|---|
| `metadata.json` | Array of 51 records, one per report (fields below). Start here. |
| `files/<id>-<year>-<slug>.pdf` | Original PDFs (~218 MB). |
| `text/<id>-<year>-<slug>.md` | Text extracted from the PDF, same stem as the PDF. Pages are separated by `<!-- page N -->`. |

## `metadata.json` fields

| Field | Meaning |
|---|---|
| `id` | Site document ID (the number at the end of the download URL); first part of file names. |
| `year` | Publication year parsed from the title. |
| `title` | Title as listed on the site, starting with the year (e.g. `2024 \| Piecza zastępcza w Małopolsce...`). |
| `description` | Summary text from the listing (can be long). |
| `info` | File type and size as shown by the site (`Typ: PDF. Rozmiar: 15.41 MB`). |
| `url` | Download URL (`/pliki-do-pobrania/wpis,<slug>,<id>` returns the PDF directly). |
| `file`, `text` | Paths to the PDF and the extracted text, relative to the repository root, forward slashes. |
| `pages` | Page count of the PDF. |

## Notes

- Text is extracted with PyMuPDF. Cover pages and image-only pages come out empty; tables and charts are flattened to plain text, so tables lose structure. For exact figures, open the PDF.
- Slugs in file names are truncated to 80 characters.
- Some reports are split into several parts (e.g. 2022 "Badanie potencjału JST..." has three files with the same title prefix).
- Re-run: `python scrapers/raporty.py` (existing PDFs/text are skipped).
