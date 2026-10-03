import json

from app.core.config import settings
from app.repositories import innovation as repo_module
from app.repositories.innovation import InnovationRepository
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


def make_repo(tmp_path, overlay=None) -> InnovationRepository:
    repo_module._load.cache_clear()
    repo_module._load_overlay.cache_clear()
    path = tmp_path / "innowacje.json"
    path.write_text(json.dumps([RECORD, RECORD | {"slug": "test-b"}]), encoding="utf-8")
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


def test_real_database_loads():
    repo_module._load.cache_clear()
    repo_module._load_overlay.cache_clear()
    repo = InnovationRepository(settings.innovations_path)
    assert len(repo.all()) == 115
