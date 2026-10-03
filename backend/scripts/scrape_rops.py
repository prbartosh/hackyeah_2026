"""Pobiera Bibliotekę Innowacji Społecznych ROPS do plików JSON.

Użycie (z katalogu backend/):
    python scripts/scrape_rops.py            # pobierz, sparsuj, zapisz
    python scripts/scrape_rops.py --refresh  # zignoruj cache HTML

Wynik trafia do assets/innowacje-spoleczne/:
    innowacje.json  - lista rekordów (jedna innowacja = jeden rekord)
    kategorie.json  - 9 kategorii z liczbą innowacji
    .cache/         - surowy HTML (poza gitem)

Źródło: https://rops.krakow.pl (treści na licencji CC BY 4.0).
Nazwisk autorów nie zapisujemy (brak danych osobowych), tylko nazwę organizacji.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
from datetime import date
from pathlib import Path
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup, Tag

BASE = "https://rops.krakow.pl"
LIBRARY = "/innowacje-spoleczne/biblioteka-innowacji-spolecznych"
CATEGORIES_URL = f"{BASE}{LIBRARY}/kategorie"
HEADERS = {"User-Agent": "Mozilla/5.0 (HackYeah2026 Pomost Malopolski; data import)"}
DELAY_S = 0.3

OUT_DIR = Path(__file__).resolve().parents[2] / "assets" / "innowacje-spoleczne"
CACHE_DIR = OUT_DIR / ".cache"

ITEM_LINK = re.compile(rf"^{re.escape(LIBRARY)}/([a-z0-9-]+),([a-z0-9-]+)$")
HEADING = re.compile(r"^\s*\d+\s*[.)]\s*(.+?)\s*$")

SECTION_FIELDS = [
    ("na czym polega", "opis"),
    ("jakich problemow", "problem"),
    ("grupa docelowa", "grupa_docelowa"),
    ("kto moze skorzystac", "kto_moze_skorzystac"),
    ("czy to dziala", "czy_dziala"),
    ("autor", "organizacja"),
]


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower().replace("ł", "l"))
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", text).strip()


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\xa0", " ").replace("​", " ")).strip()


def fetch(client: httpx.Client, url: str, refresh: bool) -> str:
    cache = CACHE_DIR / (re.sub(r"[^a-z0-9,-]+", "_", url.removeprefix(BASE).lower()) + ".html")
    if cache.exists() and not refresh:
        return cache.read_text(encoding="utf-8")
    time.sleep(DELAY_S)
    resp = client.get(url)
    resp.raise_for_status()
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache.write_text(resp.text, encoding="utf-8")
    return resp.text


def parse_category_page(html: str) -> tuple[str, list[tuple[str, str]]]:
    soup = BeautifulSoup(html, "html.parser")
    title = soup.select_one(".content__main .page-title") or soup.find("h1")
    name = clean(title.get_text()) if title else ""
    found: list[tuple[str, str]] = []
    for a in soup.select("a[href]"):
        path = re.sub(r"^https?://rops\.krakow\.pl", "", a["href"])
        m = ITEM_LINK.match(path)
        if m and (m[1], m[2]) not in found:
            found.append((m[1], m[2]))
    return name, found


def _section_text(heading: Tag) -> str:
    parts: list[str] = []
    for sib in heading.find_next_siblings():
        if sib.name in {"h2", "h3", "h4", "h5"} and HEADING.match(sib.get_text()):
            break
        if sib.name in {"p", "ul", "ol", "div"}:
            items = sib.find_all("li") if sib.name in {"ul", "ol"} else [sib]
            parts += [t for t in (clean(i.get_text(" ")) for i in items) if t]
    return "\n".join(parts)


ORG_HINT = re.compile(
    r"fundacj|stowarzyszeni|uniwersytet|politechnik|akademi|instytut|centrum|spółdziel|"
    r"towarzystw|gmin|urząd|szkoł|przedszkol|\bsp\.|\bs\.a\.|spółk|zespół|ośrodek|związek|"
    r"caritas|hospicjum|szpital|muzeum|bibliotek|parafi|poradni|klub|inkubator|operator|"
    r"\bmops\b|\bgops\b|\bpcpr\b|\bops\b|\bdps\b|sp\. z o",
    re.IGNORECASE,
)


def _organization_only(text: str) -> str | None:
    """Zostawia tylko linie wyglądające na nazwę organizacji (bez osób prywatnych)."""
    lines = [ln for ln in text.split("\n") if ln and not ln.startswith(("-", "–", "•"))]
    return "\n".join(ln for ln in lines if ORG_HINT.search(ln)) or None


def parse_item_page(html: str, slug: str, categories: list[str], url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    main = soup.select_one(".content__main")
    if main is None:
        raise ValueError(f"brak .content__main: {url}")
    title = main.select_one(".page-title")
    body = main.select_one(".text-content") or main

    record: dict = {
        "slug": slug,
        "url_zrodlowy": url,
        "nazwa": clean(title.get_text()) if title else slug,
        "kategorie": categories,
        "wybrana_do_upowszechniania": False,
        "opis": None,
        "problem": None,
        "grupa_docelowa": None,
        "kto_moze_skorzystac": None,
        "czy_dziala": None,
        "organizacja": None,
        "pdf_url": None,
        "youtube_url": None,
        "materialy_url": None,
        "obraz_url": None,
        "licencja": None,
        "pobrano_dnia": date.today().isoformat(),
    }

    first = body.find("p")
    if first and "WYBRANA DO UPOWSZECHNIANIA" in first.get_text().upper():
        record["wybrana_do_upowszechniania"] = True

    for a in body.select("a[href]"):
        href = urljoin(BASE, a["href"].replace("&amp;", "&"))
        low = href.lower()
        if low.endswith(".pdf") and not record["pdf_url"]:
            record["pdf_url"] = href
        elif ("youtube.com" in low or "youtu.be" in low) and not record["youtube_url"]:
            record["youtube_url"] = href
        elif low.endswith(".zip") and not record["materialy_url"]:
            record["materialy_url"] = href
        elif "creativecommons.org" in low and not record["licencja"]:
            record["licencja"] = href
    for img in body.select("table img[src]"):
        src = img["src"]
        if "/BIBLIOTEKA_INNOWACJI_SPOECZNYCH/" in src:
            record["obraz_url"] = urljoin(BASE, src)
            break

    for heading in body.find_all(["h2", "h3", "h4", "h5"]):
        m = HEADING.match(heading.get_text())
        if not m:
            continue
        key = norm(m[1])
        for fragment, field in SECTION_FIELDS:
            if fragment in key:
                text = _section_text(heading)
                record[field] = _organization_only(text) if field == "organizacja" else text
                break
    for field in ("opis", "problem", "grupa_docelowa", "kto_moze_skorzystac", "czy_dziala", "organizacja"):
        record[field] = record[field] or None
    return record


def scrape(refresh: bool) -> tuple[list[dict], list[dict]]:
    with httpx.Client(headers=HEADERS, timeout=30, follow_redirects=True) as client:
        index_html = fetch(client, CATEGORIES_URL, refresh)
        cat_slugs = sorted(
            {
                m[1]
                for a in BeautifulSoup(index_html, "html.parser").select("a[href]")
                if (m := re.match(rf"^(?:https?://rops\.krakow\.pl)?{re.escape(LIBRARY)}/(dla-[a-z0-9-]+)$", a["href"]))
            }
        )
        categories: list[dict] = []
        item_cats: dict[str, list[str]] = {}
        item_paths: dict[str, str] = {}
        for cat in cat_slugs:
            name, links = parse_category_page(fetch(client, f"{BASE}{LIBRARY}/{cat}", refresh))
            slugs = []
            for c, slug in links:
                if c != cat:
                    continue
                slugs.append(slug)
                item_cats.setdefault(slug, [])
                if cat not in item_cats[slug]:
                    item_cats[slug].append(cat)
                item_paths.setdefault(slug, f"{LIBRARY}/{c},{slug}")
            categories.append(
                {
                    "slug": cat,
                    "nazwa": name,
                    "url_zrodlowy": f"{BASE}{LIBRARY}/{cat}",
                    "liczba_innowacji": len(slugs),
                    "innowacje": slugs,
                }
            )
        innovations = []
        for slug, path in sorted(item_paths.items()):
            url = f"{BASE}{path}"
            innovations.append(parse_item_page(fetch(client, url, refresh), slug, item_cats[slug], url))
    return innovations, categories


def report(innovations: list[dict]) -> None:
    required = ("opis", "problem", "grupa_docelowa", "kto_moze_skorzystac", "czy_dziala")
    print(f"Innowacji: {len(innovations)}")
    for rec in innovations:
        missing = [f for f in required if not rec[f]]
        if missing:
            print(f"  braki w {rec['slug']}: {', '.join(missing)}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--refresh", action="store_true", help="pobierz ponownie, pomijając cache")
    args = ap.parse_args()
    innovations, categories = scrape(args.refresh)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "innowacje.json").write_text(
        json.dumps(innovations, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT_DIR / "kategorie.json").write_text(
        json.dumps(categories, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    report(innovations)
    for cat in categories:
        print(f"  {cat['slug']}: {cat['liczba_innowacji']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
