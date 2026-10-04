# canvas – Social Innovation Canvas (INNO AGH)

A 3-page "Social Innovation Canvas" template (INNO AGH), a worksheet for describing a social innovation: problem, change actors, solution, and so on. Language: Polish. ~7.4 MB. It is also linked from the "Publikacje ze świata innowacji" page, but kept in its own folder.

- **Source:** <https://rops.krakow.pl/mpliki/IS/Moj_folder/INNO_AGH_-_SOCIAL_CANVAS.pdf> (detail page: <https://rops.krakow.pl/pliki-do-pobrania/wpis,social-canvas,1547>)
- **Scraped:** 2026-10-03 with `scrapers/publikacje.py` (same script as `../publikacje/`).

## Licence

Unknown. Neither the page nor the PDF text states a licence (checked 2026-10-03). Show the source and link only.

## Layout

| Path | What it is |
|---|---|
| `metadata.json` | One record: `title`, `url`, `file`, `text`, `pages` (3). Paths relative to the repo root, forward slashes. |
| `files/inno-agh-social-canvas.pdf` | The original PDF. |
| `text/inno-agh-social-canvas.md` | Extracted text. |

## Text extraction

The text in `text/` was extracted with `pdftotext` (poppler), which reads the PDF's font encoding correctly. The first version, made with `pypdf`, had broken Polish characters (e.g. "Intensywno[", "Przystˇpno["), so it was replaced on 2026-10-04. Emoji, form-fill dot leaders and bullet indentation were removed. Reading order is by text block, so a question and its answer options can be separated by other columns; for the exact layout use the PDF.
