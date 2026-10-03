import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from scrape_rops import parse_category_page, parse_item_page  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures"


def load(name: str, slug: str, cat: str = "dla-seniorow") -> dict:
    html = (FIXTURES / f"{name}.html").read_text(encoding="utf-8")
    return parse_item_page(html, slug, [cat], f"https://example.test/{cat},{slug}")


def test_full_page():
    rec = load("merkury", "merkury")
    assert rec["nazwa"] == "Merkury"
    assert rec["wybrana_do_upowszechniania"] is True
    assert "symulatora" in rec["opis"]
    assert "kompetencje" in rec["problem"]
    assert rec["grupa_docelowa"] and rec["kto_moze_skorzystac"] and rec["czy_dziala"]
    assert rec["organizacja"] == "Stowarzyszenie Edukacji Pozaformalnej „Meritum”"
    assert rec["pdf_url"].endswith(".pdf")
    assert "youtube.com" in rec["youtube_url"]
    assert rec["licencja"].startswith("https://creativecommons.org/")


def test_no_personal_names_in_record():
    rec = load("merkury", "merkury")
    assert "Kosiński" not in str(rec)


def test_missing_section_is_none():
    rec = load("brak_sekcji", "teleasystent", "dla-osob-z-niepelnosprawnoscia-sensoryczna")
    assert rec["opis"] is None
    assert rec["problem"]


def test_author_variant():
    rec = load("autorka", "x")
    assert rec["opis"] and rec["problem"]


def test_category_page_links():
    html = (
        '<div class="content__main"><h2 class="page-title">Dla seniorów</h2>'
        '<a href="/innowacje-spoleczne/biblioteka-innowacji-spolecznych/dla-seniorow,merkury">a</a>'
        '<a href="https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/dla-seniorow,merkury">a</a>'
        '<a href="/innowacje-spoleczne/biblioteka-innowacji-spolecznych/dla-seniorow">kat</a></div>'
    )
    name, links = parse_category_page(html)
    assert name == "Dla seniorów"
    assert links == [("dla-seniorow", "merkury")]
