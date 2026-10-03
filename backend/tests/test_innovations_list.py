import json

import pytest

from app.api.deps import get_innovation_repository
from app.core.config import DEFAULT_INNOVATIONS_PATH
from app.main import app
from app.repositories import innovation as repo_module
from app.repositories.innovation import InnovationRepository
from app.repositories.innovation_search import normalize

BASE = {
    "slug": "x",
    "url_zrodlowy": "https://rops.krakow.pl/x",
    "nazwa": "X",
    "kategorie": ["dla-seniorow"],
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
    "pobrano_dnia": None,
}

RECORDS = [
    BASE | {"slug": "zeta", "nazwa": "Żółty wózek", "problem": "Brak wózków dla osób starszych."},
    BASE
    | {
        "slug": "alfa",
        "nazwa": "Alfa",
        "kategorie": ["dla-cudzoziemcow"],
        "wybrana_do_upowszechniania": True,
        "opis": "Pomoc dla cudzoziemców w urzędzie.",
    },
    BASE | {"slug": "beta", "nazwa": "Łódzka beta", "organizacja": "Fundacja Głuchych"},
]
CATEGORIES = [
    {"slug": "dla-seniorow", "nazwa": "Dla seniorów"},
    {"slug": "dla-cudzoziemcow", "nazwa": "Dla cudzoziemców"},
    {"slug": "dla-rynku-pracy", "nazwa": "Dla rynku pracy"},
]


def make_repo(tmp_path, categories=CATEGORIES) -> InnovationRepository:
    repo_module._load.cache_clear()
    repo_module._load_overlay.cache_clear()
    repo_module._load_category_names.cache_clear()
    repo_module._load_haystacks.cache_clear()
    path = tmp_path / "innowacje.json"
    path.write_text(json.dumps(RECORDS), encoding="utf-8")
    if categories is not None:
        (tmp_path / "kategorie.json").write_text(json.dumps(categories), encoding="utf-8")
    return InnovationRepository(path)


def slugs(items) -> list[str]:
    return [i.slug for i in items]


def test_normalize_folds_case_and_polish_letters():
    assert normalize("Łódź, ŻÓŁĆ") == "lodz, zolc"


def test_list_without_filters_sorts_by_name_ignoring_diacritics(tmp_path):
    # Alfa, Łódzka (jak „L”), Żółty (jak „Z”)
    assert slugs(make_repo(tmp_path).list()) == ["alfa", "beta", "zeta"]


def test_list_filters_by_category_and_selected(tmp_path):
    repo = make_repo(tmp_path)
    assert slugs(repo.list(kategoria="dla-cudzoziemcow")) == ["alfa"]
    assert slugs(repo.list(wybrane=True)) == ["alfa"]
    assert repo.list(kategoria="dla-seniorow", wybrane=True) == []
    assert repo.list(kategoria="nie-ma") == []


@pytest.mark.parametrize("q", ["ZOLTY", "żółty", "wozek", "wózek żółty"])
def test_search_ignores_case_and_diacritics(tmp_path, q):
    assert slugs(make_repo(tmp_path).list(q=q)) == ["zeta"]


def test_search_requires_every_word(tmp_path):
    repo = make_repo(tmp_path)
    assert slugs(repo.list(q="wózek starszych")) == ["zeta"]
    assert repo.list(q="wózek cudzoziemców") == []


def test_search_handles_inflection(tmp_path):
    repo = make_repo(tmp_path)
    assert slugs(repo.list(q="wózek")) == ["zeta"]  # w tekście „wózków”
    assert slugs(repo.list(q="cudzoziemcom")) == ["alfa"]  # 6+ liter: rdzeń „cudzoziemc”


def test_search_covers_description_and_organization(tmp_path):
    repo = make_repo(tmp_path)
    assert slugs(repo.list(q="urzędzie")) == ["alfa"]
    assert slugs(repo.list(q="głuchych")) == ["beta"]


def test_search_combines_with_category_and_blank_query_is_ignored(tmp_path):
    repo = make_repo(tmp_path)
    assert repo.list(q="wózek", kategoria="dla-cudzoziemcow") == []
    assert len(repo.list(q="   ")) == 3
    assert len(repo.list(q="")) == 3


def test_categories_have_names_and_counts(tmp_path):
    cats = make_repo(tmp_path).categories()
    assert [(c.slug, c.nazwa, c.liczba_innowacji) for c in cats] == [
        ("dla-cudzoziemcow", "Dla cudzoziemców", 1),
        ("dla-rynku-pracy", "Dla rynku pracy", 0),
        ("dla-seniorow", "Dla seniorów", 2),
    ]


def test_categories_work_without_names_file(tmp_path):
    cats = make_repo(tmp_path, categories=None).categories()
    assert [(c.slug, c.nazwa, c.liczba_innowacji) for c in cats] == [
        ("dla-cudzoziemcow", "dla-cudzoziemcow", 1),
        ("dla-seniorow", "dla-seniorow", 2),
    ]


@pytest.fixture
def fake_repo(tmp_path):
    app.dependency_overrides[get_innovation_repository] = lambda: make_repo(tmp_path)
    yield
    app.dependency_overrides.pop(get_innovation_repository, None)


async def test_list_endpoint(client, fake_repo):
    res = await client.get("/api/v1/innovations", params={"q": "wózek"})
    assert res.status_code == 200
    assert [r["slug"] for r in res.json()] == ["zeta"]
    assert res.json()[0]["nazwa"] == "Żółty wózek"


async def test_list_endpoint_filters(client, fake_repo):
    res = await client.get(
        "/api/v1/innovations", params={"kategoria": "dla-cudzoziemcow", "wybrane": "true"}
    )
    assert [r["slug"] for r in res.json()] == ["alfa"]
    res = await client.get("/api/v1/innovations")
    assert [r["slug"] for r in res.json()] == ["alfa", "beta", "zeta"]


async def test_list_endpoint_validates_params(client, fake_repo):
    assert (await client.get("/api/v1/innovations", params={"q": "a" * 201})).status_code == 422
    assert (await client.get("/api/v1/innovations", params={"wybrane": "nie"})).status_code == 422


async def test_detail_endpoint_still_works_next_to_list(client, fake_repo):
    assert (await client.get("/api/v1/innovations/alfa")).json()["nazwa"] == "Alfa"
    assert (await client.get("/api/v1/innovations/nie-ma")).status_code == 404


async def test_categories_endpoint(client, fake_repo):
    res = await client.get("/api/v1/categories")
    assert res.status_code == 200
    assert res.json()[0] == {
        "slug": "dla-cudzoziemcow",
        "nazwa": "Dla cudzoziemców",
        "liczba_innowacji": 1,
    }


def test_real_database_categories_match_filter():
    for fn in (
        repo_module._load,
        repo_module._load_overlay,
        repo_module._load_category_names,
        repo_module._load_haystacks,
    ):
        fn.cache_clear()
    repo = InnovationRepository(DEFAULT_INNOVATIONS_PATH)
    cats = repo.categories()
    assert len(cats) == 9
    assert sum(c.liczba_innowacji for c in cats) == len(repo.list()) == 115
    for c in cats:
        assert len(repo.list(kategoria=c.slug)) == c.liczba_innowacji
    assert 0 < len(repo.list(wybrane=True)) < 115
    assert len(repo.list(q="wózek")) > 4
