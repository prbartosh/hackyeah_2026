"""Shared helpers for the ROPS scrapers."""
import json
import re
import time
from pathlib import Path

import pymupdf
import requests

ASSETS = Path(__file__).resolve().parent.parent / "assets"
BASE = "https://rops.krakow.pl"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
DELAY = 0.5

session = requests.Session()
session.headers["User-Agent"] = UA


def get(url, **kw):
    """GET/POST with retries and a polite delay."""
    method = kw.pop("method", "GET")
    for attempt in range(4):
        try:
            r = session.request(method, url, timeout=60, **kw)
            r.raise_for_status()
            time.sleep(DELAY)
            return r
        except requests.RequestException:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def slugify(text, limit=80):
    text = text.lower()
    for a, b in zip("ąćęłńóśźż", "acelnoszz"):
        text = text.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:limit]


def download(url, dest: Path):
    """Download url to dest unless it already exists. Returns the response headers or None."""
    if dest.exists() and dest.stat().st_size > 0:
        return None
    dest.parent.mkdir(parents=True, exist_ok=True)
    r = get(url, stream=True)
    with open(dest, "wb") as f:
        for chunk in r.iter_content(1 << 16):
            f.write(chunk)
    return r.headers


def pdf_to_markdown(pdf: Path, out: Path):
    """Extract text per page into a markdown file. Returns page count."""
    out.parent.mkdir(parents=True, exist_ok=True)
    with pymupdf.open(pdf) as doc, open(out, "w", encoding="utf-8") as f:
        for i, page in enumerate(doc, 1):
            f.write(f"\n\n<!-- page {i} -->\n\n{page.get_text().strip()}")
        return len(doc)


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
