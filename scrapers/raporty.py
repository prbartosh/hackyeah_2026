"""Raporty z badań -> assets/raporty/{files,text,metadata.json}"""
import re

from bs4 import BeautifulSoup

from common import ASSETS, BASE, download, get, pdf_to_markdown, slugify, write_json

URL = f"{BASE}/badania-analizy-raporty/raporty-z-badan"
OUT = ASSETS / "raporty"


def main():
    soup = BeautifulSoup(get(URL).text, "html.parser")
    items = []
    for li in soup.select("ul.files__list li.files__item"):
        a = li.select_one("a.files__link")
        title = a.get_text(strip=True)
        m = re.match(r"(\d{4})\s*(?:\|\s*|I\s+)?(.*)", title)
        year = int(m.group(1)) if m else None
        desc = li.select_one("p")
        info = li.select_one(".files__info")
        url = BASE + a["href"]
        doc_id = a["href"].rsplit(",", 1)[-1]
        stem = f"{doc_id}-{slugify(title)}"
        pdf, md = OUT / "files" / f"{stem}.pdf", OUT / "text" / f"{stem}.md"
        download(url, pdf)
        pages = pdf_to_markdown(pdf, md) if not md.exists() else None
        items.append({
            "id": doc_id, "year": year, "title": title,
            "description": desc.get_text("\n", strip=True) if desc else "",
            "info": info.get_text(" ", strip=True) if info else "",
            "url": url, "file": pdf.relative_to(ASSETS.parent).as_posix(),
            "text": md.relative_to(ASSETS.parent).as_posix(), "pages": pages,
        })
        print(title[:90])
    write_json(OUT / "metadata.json", items)
    print(len(items), "reports")


if __name__ == "__main__":
    main()
