# obserwator – Internetowy Obserwator Statystyk Społecznych

Social and demographic statistics for the Małopolska voivodeship (Poland) by **powiat and gmina**, one value per indicator / area / year.

- **Source:** <https://obserwator.rops.krakow.pl/> (run by ROPS Kraków, Dział Badań i Analiz). Underlying data comes from GUS (Bank Danych Lokalnych, census), ministry social-assistance reports (MRPiPS-03, MRPiPS-05, MPiPS-06, OZPS), OKE/CKE exam boards, MEN/SIO, the voivodeship office and others. The original source of each indicator is in `indicators.json` (`description.Źródło`).
- **Scraped:** 2026-10-03 with `scrapers/obserwator.py`. Language: Polish.
- **Coverage:** 184 indicators in 15 categories, years 2007–2024 (coverage varies per indicator), 22 powiats and 179 gmina entries.

## Licence

Unknown. The site (home page, contact, footer) states no licence or terms of reuse (checked 2026-10-03). About 100 of 184 indicators come (also) from GUS. The GUS page <https://stat.gov.pl/copyright> says GUS has no reservations about copying files and pages and about own studies based on GUS data, on condition that the source is given (checked 2026-10-03). Other sources (ministry reports MRiPS/MPiPS/OZPS, OKE/CKE, MEN/SIO, Małopolski Urząd Wojewódzki) were **not** checked. Show the indicator's source from `indicators.json` (`description.Źródło`) next to every value.

## Files

| Path | What it is |
|---|---|
| `observations.csv` | **Main dataset.** All indicators merged, long format, ~403 400 rows. |
| `data/<indicator_id>.csv` | The same rows split per indicator (same columns). 184 files; 32 are header-only (see "Empty indicators"). |
| `wskazniki-czatu.json` | Indicators shown in the chat for a gmina (task 0013): `id`, display `nazwa`, short `zrodlo`. Read by `ObserwatorRepository` in the backend. |
| `indicators.json` | Indicator catalogue: `id`, `name`, `category`, `years` (years offered by the site, not years with data), `description` (`Nazwa wskaźnika`, `Źródło`, `Opis`). |
| `text/<id>-<slug>.md` | One readable markdown page per indicator: name, category, source, description and a powiat × year table. Best for search/RAG. Gmina values are **not** in these files. |

## `observations.csv` columns

| Column | Meaning |
|---|---|
| `indicator_id` | Site ID (`/differenceanalysis/<id>`); key into `indicators.json`. |
| `indicator` | Indicator name (Polish). |
| `year` | Year as string, 2007–2024. |
| `level` | `powiat` or `gmina`. |
| `area` | Area name. Powiats are like `powiat bocheński`, `powiat m. Kraków`. Gmina entries are like `Drwinia` or `Bochnia (miasto)` / `Bochnia (wieś)` (urban and rural parts of an urban-rural gmina are separate rows). |
| `powiat` | The parent powiat (equals `area` when `level = powiat`). Use it to join gminas to their powiat. |
| `value` | Value as text. Decimal point `.`; no thousands separators. Some values carry a `%` sign (e.g. `12.50%`). Empty string = no value. |

All columns are strings; parse `value` yourself (strip `%`).

```python
import pandas as pd
df = pd.read_csv("assets/obserwator/observations.csv", dtype=str)
df["num"] = pd.to_numeric(df["value"].str.rstrip("%"), errors="coerce")
pop = df[(df.indicator_id == "186") & (df.level == "powiat") & (df.year == "2024")]
```

## Things to know

- **Powiat values are almost always present (43 blank of ~44 000); gmina values often are blank** (about half of all rows). The site returns an empty cell or "Brak danych" when there is no value (stored as an empty string); many indicators (e.g. infrastructure counts) exist only at powiat level.
- **Years with no data are simply absent**, not blank. 84 indicators have fewer years than the site's dropdown (2007–2024) offers. Census-based indicators (family, disability) exist only for 2011 and/or 2021.
- **Some values are ratios / indices** computed by ROPS (e.g. per 1 000 inhabitants), not raw GUS counts.
- **No voivodeship-total row** is stored; sum powiats or use GUS if you need the region total.
- Units are not in the CSV. They are only implicit in the indicator name/description.

## Empty indicators (site serves no data)

32 indicators are listed in the site menu but have no data anywhere on the site. Their CSVs contain only a header and `text/` has no useful table. Checked 2026-10-03: the comparison view offers no year for them, and the powiat-portrait view never lists them, for any powiat or year 2007–2024.

`130 131 132 133 134 135 136 137 138 139 140 141 142 143 145 146 148 149 150 151 196 197 198 199 200 261 271 272 280 281 282 283`

Covers: fertility and life expectancy, poverty rates and household income/expenditure, employment rates (all variants), pensions, university students, migration balance (European/American), disability employment, and a few care/health items.

**Indicators 172, 173, 174** (DPS waiting lists: elderly, chronically somatically ill, chronically mentally ill) are not served by the comparison view either, but the **powiat portrait** view has them for **2010–2012 only**. The scraper falls back to that view (`/portrait/ajax/district/1/year/<y>/pointer/<id>`), which returns the same table (all powiats, gminas as child rows). Their gmina values are all blank and a few powiat values are missing. Values are percentages (e.g. `25.00%`); the indicator description on the site is probably copy-pasted from another indicator, so rely on the name.

## Categories (indicator counts)

Ludność (26), Gospodarstwa domowe (10), Rodzina (8), Pomoc społeczna – kadra (4), – powody korzystania (14), – beneficjenci (15), – świadczenia (8), – infrastruktura (15), Piecza zastępcza (7), Zdrowie (13), Niepełnosprawność (9), Wynagrodzenia/emerytury/renty (6), Kultura (5), Edukacja (17), Rynek pracy (19), Mobilność (4), Budżety gmin (4).

## Provenance of the data

About 96 indicators are GUS-only (also available in BDL), 14 are mixed, and 74 come from non-GUS sources (social-assistance ministry reports, exam boards, MEN, regional registers). The non-GUS ones (mainly social assistance, foster care, education exams) are the part not easily found elsewhere. Spot check: indicator 186 (population) matches the GUS BDL API exactly.

## Re-running

`python scrapers/obserwator.py` (needs `scrapers/requirements.txt`). It POSTs the site's form for every indicator and year (8 parallel workers) and skips indicators whose `data/<id>.csv` already exists. Delete a CSV to refetch it.
