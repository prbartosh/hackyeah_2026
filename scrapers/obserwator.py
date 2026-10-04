"""Internetowy Obserwator Statystyk Społecznych -> assets/obserwator

For every indicator (/differenceanalysis/<id>) and year, POST the form for the whole
voivodeship; the response holds one row per powiat plus its gminas as child rows.
Output: data/<id>.csv (resumable), indicators.json, observations.csv, text/<id>.md
"""
import csv
import os
import sys
from concurrent.futures import ThreadPoolExecutor

from bs4 import BeautifulSoup
from common import ASSETS, get, slugify, write_json

HOST = "https://obserwator.rops.krakow.pl"
OUT = ASSETS / "obserwator"
WORKERS = 8
PORTRAIT_YEARS = range(2007, 2025)
FIELDS = ["indicator_id", "indicator", "year", "level", "area", "powiat", "value"]


class ParseError(RuntimeError):
    """Źródło nie ma struktury, której wymaga parser; wyniku nie wolno cache'ować."""


def indicator_list():
    soup = BeautifulSoup(get(HOST + "/").text, "html.parser")
    out, seen = [], set()
    for item in soup.select("li.side-menu__nav-item"):
        cat = item.select_one("button.side-menu__nav-link")
        if not cat:
            continue
        for a in item.select('a[href^="/differenceanalysis/"]'):
            iid = a["href"].rsplit("/", 1)[-1]
            if iid.isdigit() and iid not in seen:
                seen.add(iid)
                out.append(
                    {
                        "id": iid,
                        "name": a.get_text(strip=True),
                        "category": cat.get_text(strip=True),
                    }
                )
    return out


def num(cell):
    t = cell.get_text(strip=True)
    if t == "Brak danych":
        return ""
    return t.replace("\xa0", "").replace(" ", "").replace(",", ".")


def parse(html, iid, name, year, *, table_required=True):
    soup = BeautifulSoup(html, "html.parser")
    table = soup.select_one("#tabela table.with-child-tables") or soup.select_one(
        "table.with-child-tables"
    )
    rows = []
    if not table:
        if table_required:
            raise ParseError(f"Brak tabeli danych dla wskaźnika {iid}, rok {year}")
        return rows
    for tr in table.select("tbody > tr"):
        tds = tr.find_all("td", recursive=False)
        if len(tds) < 2:
            continue
        powiat = tds[0].get_text(strip=True)
        rows.append([iid, name, year, "powiat", powiat, powiat, num(tds[-1])])
        child_id = f"#{table['data-table-id']}_table_child_row_{tr.get('data-child-row')}"
        child = soup.select_one(child_id)
        if child:
            for ctr in child.select("tr"):
                c = ctr.find_all("td")
                if len(c) >= 2:
                    rows.append(
                        [iid, name, year, "gmina", c[0].get_text(strip=True), powiat, num(c[-1])]
                    )
    return rows


def csv_has_data(path):
    """Sam nagłówek nie potwierdza poprawnego pobrania i nie kończy wznowienia."""
    if not path.exists():
        return False
    with open(path, encoding="utf-8") as f:
        reader = csv.reader(f)
        return next(reader, None) == FIELDS and next(reader, None) is not None


def describe(soup):
    box = soup.select_one("#opis .analysisContent")
    if not box:
        return {}
    sections, key = {}, "Nazwa wskaźnika"
    for el in box.find_all(["h2", "h3", "p"]):
        if el.name in ("h2", "h3"):
            key = el.get_text(strip=True)
        else:
            sections.setdefault(key, []).append(el.get_text("\n", strip=True))
    return {k: "\n".join(v) for k, v in sections.items()}


def scrape(ind):
    iid, name = ind["id"], ind["name"]
    url = f"{HOST}/differenceanalysis/{iid}"
    csv_path = OUT / "data" / f"{iid}.csv"
    first = BeautifulSoup(get(url).text, "html.parser")
    ind["description"] = describe(first)
    years = [o["value"] for o in first.select("#differenceanalysis_year option")]
    ind["years"] = years
    if csv_has_data(csv_path):
        return
    rows = []
    if not years:
        # Some indicators have no year dropdown on /differenceanalysis but are served by the
        # "Portret powiatu" view (e.g. 172-174 for 2010-2012). Probe it for every year.
        for y in PORTRAIT_YEARS:
            r = get(f"{HOST}/portrait/ajax/district/1/year/{y}/pointer/{iid}")
            rows += parse(r.text, iid, name, str(y), table_required=False)
        if not any(x[6] for x in rows):
            rows = []
        else:
            ind["years"] = sorted({x[2] for x in rows}, reverse=True)
    for y in years:
        r = get(
            url,
            method="POST",
            data={"differenceanalysis[year]": y, "differenceanalysis[regions]": "-1"},
        )
        rows += parse(r.text, iid, name, y)
    if not rows:
        # Pustej odpowiedzi nie zapisujemy jako sukcesu. Przy kolejnym uruchomieniu źródło
        # zostanie sprawdzone ponownie, zamiast wiecznie ufać plikowi z samym nagłówkiem.
        print(iid, name, "no validated rows; cache unchanged", flush=True)
        return
    tmp = csv_path.with_suffix(f".{os.getpid()}.tmp")
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(FIELDS)
        w.writerows(rows)
    tmp.replace(csv_path)
    print(iid, name, len(rows), "rows", flush=True)


def main(limit=None):
    (OUT / "data").mkdir(parents=True, exist_ok=True)
    all_inds = indicator_list()
    inds = all_inds[:limit] if limit is not None else all_inds
    print(len(inds), "indicators")
    with ThreadPoolExecutor(WORKERS) as ex:
        list(ex.map(scrape, inds))
    if limit is not None:
        print("limited run: global indicators.json and observations.csv left unchanged")
        return
    write_json(OUT / "indicators.json", all_inds)
    merge(all_inds)


def merge(inds):
    with open(OUT / "observations.csv", "w", newline="", encoding="utf-8") as out:
        w = csv.writer(out)
        w.writerow(FIELDS)
        for ind in inds:
            p = OUT / "data" / f"{ind['id']}.csv"
            if not p.exists():
                continue
            with open(p, encoding="utf-8") as f:
                rows = list(csv.reader(f))[1:]
            w.writerows(rows)
            write_md(ind, rows)


def write_md(ind, rows):
    pow_rows = [r for r in rows if r[3] == "powiat"]
    years = sorted({r[2] for r in pow_rows})
    areas = sorted({r[4] for r in pow_rows})
    val = {(r[4], r[2]): r[6] for r in pow_rows}
    lines = [f"# {ind['name']}", f"Kategoria: {ind['category']}", ""]
    for k, v in ind.get("description", {}).items():
        if k != "Nazwa wskaźnika":
            lines += [f"## {k}", v, ""]
    lines += ["## Wartości według powiatów (Małopolska)", "",
              "| Powiat | " + " | ".join(years) + " |", "|---|" + "---|" * len(years)]
    for a in areas:
        lines.append(f"| {a} | " + " | ".join(val.get((a, y), "") for y in years) + " |")
    p = OUT / "text" / f"{ind['id']}-{slugify(ind['name'])}.md"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else None)
