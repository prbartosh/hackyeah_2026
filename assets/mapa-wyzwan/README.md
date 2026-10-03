# mapa-wyzwan – Mapa Wyzwań Społecznych

A single document, "Załącznik nr 2. Mapa Wyzwań Społecznych" (Map of Social Challenges), from the ROPS Kraków social innovation programme (path `IWS_20` on the ROPS site). Language: Polish. 44 pages, ~7.5 MB.

- **Source:** <https://rops.krakow.pl/mpliki/IS/IWS_20/za._nr_2._Mapa_Wyzwa_Spoecznych.pdf>
- **Scraped:** 2026-10-03 with `scrapers/mapa_wyzwan.py`.

## Licence

Unknown. The PDF text states no licence (checked 2026-10-03). Show the source and link only.

## Layout

| Path | What it is |
|---|---|
| `metadata.json` | One record: `title`, `url`, `file`, `text`, `pages`. Paths relative to the repo root, forward slashes. |
| `files/za-nr-2-mapa-wyzwa-spoecznych.pdf` | The original PDF. |
| `text/za-nr-2-mapa-wyzwa-spoecznych.md` | Extracted text, pages separated by `<!-- page N -->`. |

Text comes from PyMuPDF; tables, maps and diagrams in the PDF are flattened or lost. I did not manually check how much of this document is graphical, so open the PDF when structure matters. Re-run: `python scrapers/mapa_wyzwan.py`.
