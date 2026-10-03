import re
from urllib.parse import unquote

from bs4 import BeautifulSoup

from common import ASSETS, BASE, download, get, pdf_to_markdown, slugify, write_json

URL = f"{BASE}/innowacje-spoleczne/publikacje-ze-swiata-innowacji"
OUT = ASSETS / "publikacje"


def fetch(url, folder, title, extra):
    name = unquote(url.rsplit("/", 1)[-1])
    stem = slugify(name.rsplit(".", 1)[0])
    pdf, md = folder / "files" / f"{stem}.pdf", folder / "text" / f"{stem}.md"
    download(url, pdf)
    pages = pdf_to_markdown(pdf, md)
    return {"title": title, "url": url, "file": pdf.relative_to(ASSETS.parent).as_posix(),
            "text": md.relative_to(ASSETS.parent).as_posix(), "pages": pages, **extra}


def main():
    soup = BeautifulSoup(get(URL).text, "html.parser")
    items = []
    for tr in soup.select(".text-content table tr"):
        a = tr.select_one('a[href$=".pdf"]')
        tds = tr.find_all("td")
        if not a or len(tds) < 3:
            continue
        strong = tds[-1].find("strong")
        title = strong.get_text(strip=True).strip('"“”') if strong else a["href"]
        text = tds[-1].get_text("\n", strip=True)
        year = re.search(r"rok wydania:\s*(\d{4})", text)
        desc = text.replace(strong.get_text(strip=True), "", 1) if strong else text
        desc = re.sub(r"rok wydania:.*", "", desc).strip()
        items.append(fetch(BASE + a["href"], OUT, title,
                           {"year": int(year.group(1)) if year else None, "description": desc}))
        print(title)
    write_json(OUT / "metadata.json", items)

    # Social Canvas is linked from this page too; it has its own folder
    canvas = ASSETS / "canvas"
    c = fetch(f"{BASE}/mpliki/IS/Moj_folder/INNO_AGH_-_SOCIAL_CANVAS.pdf", canvas, "SOCIAL CANVAS", {})
    write_json(canvas / "metadata.json", [c])
    print("canvas ok;", len(items), "publications")


if __name__ == "__main__":
    main()
