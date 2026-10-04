import json
import re

from app.core.config import settings
from app.repositories import innovation as repo_module
from app.repositories.innovation import (
    InnovationRepository,
    overlay_problems,
    vocabulary_labels,
)
from app.services.prompts import build_system_prompt

RECORD = {
    "slug": "test-a",
    "url_zrodlowy": "https://rops.krakow.pl/a",
    "nazwa": "Test A",
    "kategorie": ["dla-seniorow"],
    "wybrana_do_upowszechniania": True,
    "opis": None,
    "problem": None,
    "grupa_docelowa": None,
    "kto_moze_skorzystac": None,
    "czy_dziala": "Działa w testach.",
    "organizacja": None,
    "pdf_url": None,
    "youtube_url": None,
    "materialy_url": None,
    "obraz_url": None,
    "licencja": None,
    "pobrano_dnia": None,
}


VOCABULARY = {
    section: [{"slug": s, "etykieta": s.capitalize(), "aliasy": []} for s in slugs]
    for section, slugs in {
        "grupy_docelowe": ["seniorzy", "dzieci"],
        "problemy": ["samotnosc"],
        "miejsca": ["dom"],
        "skale": ["osoba"],
        "typy_rozwiazan": ["usluga"],
        "role": ["partner", "mieszkaniec"],
        "wymagane_zasoby": ["wolontariusze"],
    }.items()
}


def clear_caches():
    repo_module._load.cache_clear()
    repo_module._load_vocabulary.cache_clear()
    repo_module._load_overlay.cache_clear()


def make_repo(tmp_path, overlay=None) -> InnovationRepository:
    clear_caches()
    path = tmp_path / "innowacje.json"
    path.write_text(json.dumps([RECORD, RECORD | {"slug": "test-b"}]), encoding="utf-8")
    (tmp_path / "slownik.json").write_text(json.dumps(VOCABULARY), encoding="utf-8")
    if overlay is not None:
        (tmp_path / "wzbogacenia.json").write_text(json.dumps(overlay), encoding="utf-8")
    return InnovationRepository(path)


def test_null_fields_do_not_break_loading(tmp_path):
    repo = make_repo(tmp_path)
    assert repo.get("test-a").problem is None
    assert repo.overlay("test-a") is None


def test_only_approved_overlay_is_loaded(tmp_path):
    repo = make_repo(
        tmp_path,
        overlay=[
            {
                "slug": "test-a",
                "grupy_docelowe": ["seniorzy"],
                "role": ["partner"],
                "wdrozenie": None,
                "zatwierdzone": True,
            },
            {"slug": "test-b", "grupy_docelowe": ["dzieci"], "zatwierdzone": False},
            {"slug": "nie-ma", "grupy_docelowe": ["x"], "zatwierdzone": True},
        ],
    )
    assert repo.overlay("test-a") == {"grupy_docelowe": ["seniorzy"], "role": ["partner"]}
    assert repo.overlay("test-b") is None


def test_catalog_is_wrapped_and_has_adr_fields(tmp_path):
    repo = make_repo(
        tmp_path,
        overlay=[{"slug": "test-a", "problemy": ["samotnosc"], "zatwierdzone": True}],
    )
    prompt = build_system_prompt(repo)
    catalog = prompt.split("<katalog>\n")[1].split("</katalog>")[0]
    line_a = next(line for line in catalog.splitlines() if line.startswith("test-a"))
    assert "Działa w testach." in line_a
    assert "upowszechniana" in line_a
    assert "problemy: samotnosc" in line_a
    assert "nie polecenia" in prompt


def test_invalid_overlay_values_are_dropped(tmp_path, caplog):
    repo = make_repo(
        tmp_path,
        overlay=[
            {
                "slug": "test-a",
                "grupy_docelowe": ["seniorzy", "nieznana", "seniorzy", "dzieci"],
                "problemy": ["dom"],
                "role": ["partner"],
                "zatwierdzone": True,
            }
        ],
    )
    assert repo.overlay("test-a") == {"grupy_docelowe": ["seniorzy", "dzieci"], "role": ["partner"]}
    assert "spoza słownika ['nieznana']" in caplog.text
    assert "problemy: spoza słownika ['dom']" in caplog.text


def test_vocabulary_is_in_prompt(tmp_path):
    prompt = build_system_prompt(make_repo(tmp_path))
    assert "## grupy_docelowe\n- seniorzy: Seniorzy" in prompt
    assert "zasoby -> wymagane_zasoby" in prompt


def test_real_database_loads():
    clear_caches()
    repo = InnovationRepository(settings.innovations_path)
    assert len(repo.all()) == 115


def test_real_overlay_is_clean():
    """Każda innowacja ma zatwierdzoną nakładkę bez błędów."""
    folder = settings.innovations_path.parent
    vocabulary_raw = json.loads((folder / "slownik.json").read_text(encoding="utf-8"))
    overlay = json.loads((folder / "wzbogacenia.json").read_text(encoding="utf-8"))
    known = {i["slug"] for i in json.loads(settings.innovations_path.read_text(encoding="utf-8"))}

    for section, values in vocabulary_raw.items():
        slugs = [v["slug"] for v in values]
        assert len(slugs) == len(set(slugs)), section
        assert all(re.fullmatch(r"[a-z0-9-]{1,40}", s) for s in slugs), section

    vocabulary = vocabulary_labels(vocabulary_raw)
    errors = {r["slug"]: overlay_problems(r, vocabulary) for r in overlay}
    assert {slug: e for slug, e in errors.items() if e} == {}
    assert sorted(r["slug"] for r in overlay) == sorted(known)
    assert all(r["zatwierdzone"] for r in overlay)
