import json
import re

from bs4 import BeautifulSoup
from common import ASSETS, BASE, download, get, pdf_to_markdown, slugify, write_json

URL = f"{BASE}/badania-analizy-raporty/raporty-z-badan"
OUT = ASSETS / "raporty"
PAGE_MARKER = re.compile(r"<!--\s*page\s+(\d+)\s*-->")


def markdown_page_count(path):
    if not path.exists():
        return None
    pages = [int(value) for value in PAGE_MARKER.findall(path.read_text(encoding="utf-8"))]
    return max(pages, default=None)


def previous_page_counts():
    path = OUT / "metadata.json"
    if not path.exists():
        return {}
    try:
        items = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, TypeError):
        return {}
    return {str(item["id"]): item.get("pages") for item in items if item.get("pages") is not None}


def main():
    soup = BeautifulSoup(get(URL).text, "html.parser")
    items = []
    old_pages = previous_page_counts()
    for li in soup.select("ul.files__list li.files__item"):
        a = li.select_one("a.files__link")
        title = a.get_text(strip=True)
        m = re.match(r"(\d{4})\s*(?:\|\s*|I\s+)?(.*)", title)
        year = int(m.group(1)) if m else None
        desc = li.select_one("p")
        info = li.select_one(".files__info")
        url = BASE + a["href"]
        description = desc.get_text("\n", strip=True) if desc else ""
        doc_id = a["href"].rsplit(",", 1)[-1]
        stem = f"{doc_id}-{slugify(title)}"
        pdf, md = OUT / "files" / f"{stem}.pdf", OUT / "text" / f"{stem}.md"
        download(url, pdf)
        if not md.exists():
            pages = pdf_to_markdown(pdf, md)
        else:
            pages = markdown_page_count(md)
            if pages is None:
                pages = old_pages.get(doc_id)
        items.append({
            "id": doc_id, "year": year, "title": title,
            "description": description,
            "licencja": "CC BY 4.0" if "licencji CC BY 4.0" in description else None,
            "info": info.get_text(" ", strip=True) if info else "",
            "url": url, "file": pdf.relative_to(ASSETS.parent).as_posix(),
            "text": md.relative_to(ASSETS.parent).as_posix(), "pages": pages,
        })
        print(title[:90])
    write_json(OUT / "metadata.json", items)
    print(len(items), "reports")


if __name__ == "__main__":
    main()
