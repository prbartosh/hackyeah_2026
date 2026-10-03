import csv
import json

import pytest

from app.api.deps import get_obserwator_repository
from app.main import app
from app.repositories.obserwator import ObserwatorRepository, normalize
from tests.test_chat import fake_llm as fake_llm  # fixture czatu zamiast tej z conftest
from tests.test_chat import first_message, post, tool

ROWS = [
    # indicator_id, year, level, area, powiat, value
    ("186", "2023", "gmina", "Drwinia", "powiat bocheński", "6300"),
    ("186", "2024", "gmina", "Drwinia", "powiat bocheński", "6354"),
    ("257", "2024", "gmina", "Drwinia", "powiat bocheński", "25.42%"),
    # Brak wartości w najnowszym roku: bierzemy starszy rok.
    ("36", "2023", "gmina", "Drwinia", "powiat bocheński", "1.50%"),
    ("36", "2024", "gmina", "Drwinia", "powiat bocheński", ""),
    ("186", "2024", "gmina", "Bochnia (miasto)", "powiat bocheński", "28339"),
    ("186", "2024", "gmina", "Bochnia (wieś)", "powiat bocheński", "20867"),
    ("186", "2024", "gmina", "Bolesław", "powiat dąbrowski", "2700"),
    ("186", "2024", "gmina", "Bolesław", "powiat olkuski", "7600"),
    ("186", "2024", "powiat", "powiat m. Kraków", "powiat m. Kraków", "804000"),
    ("186", "2024", "powiat", "powiat bocheński", "powiat bocheński", "107000"),
    # Wskaźnik spoza wybranych.
    ("1", "2024", "gmina", "Drwinia", "powiat bocheński", "99"),
    # Gmina bez żadnej wartości wybranych wskaźników.
    ("186", "2024", "gmina", "Pusta", "powiat bocheński", ""),
]

SELECTION = [
    {"id": "186", "nazwa": "Liczba mieszkańców", "zrodlo": "GUS"},
    {"id": "257", "nazwa": "Mieszkańcy 60+", "zrodlo": "GUS"},
    {"id": "36", "nazwa": "Przemoc domowa", "zrodlo": "MRPiPS-03"},
]


@pytest.fixture
def repo(tmp_path) -> ObserwatorRepository:
    path = tmp_path / "observations.csv"
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["indicator_id", "indicator", "year", "level", "area", "powiat", "value"])
        for indicator_id, year, level, area, powiat, value in ROWS:
            writer.writerow([indicator_id, "x", year, level, area, powiat, value])
    (tmp_path / "wskazniki-czatu.json").write_text(json.dumps(SELECTION), encoding="utf-8")
    return ObserwatorRepository(path)


def test_normalize():
    assert normalize("Gmina  Bolesław") == "boleslaw"
    assert normalize("KRAKÓW") == "krakow"
    assert normalize("m. Nowy-Sącz") == "nowy sacz"


def test_known_gmina_latest_year_per_indicator(repo):
    [drwinia] = repo.find("drwinia")
    values = {w.id: (w.wartosc, w.rok) for w in drwinia.wskazniki}
    assert values == {"186": ("6354", "2024"), "257": ("25,42%", "2024"), "36": ("1,50%", "2023")}
    assert drwinia.powiat == "powiat bocheński"
    assert [w.id for w in drwinia.wskazniki] == ["186", "257", "36"]
    assert drwinia.wskazniki[0].url.endswith("/differenceanalysis/186")


def test_urban_rural_gmina_returns_both_parts(repo):
    assert [o.nazwa for o in repo.find("Bochnia")] == ["Bochnia (miasto)", "Bochnia (wieś)"]
    assert [o.nazwa for o in repo.find("Bochnia (wieś)")] == ["Bochnia (miasto)", "Bochnia (wieś)"]


def test_same_name_in_two_powiats(repo):
    assert [o.powiat for o in repo.find("Bolesław")] == ["powiat dąbrowski", "powiat olkuski"]


def test_city_with_powiat_rights(repo):
    [krakow] = repo.find("Krakow")
    assert krakow.nazwa == "powiat m. Kraków"
    assert repo.find("bocheński") == []


def test_unknown_and_empty(repo):
    assert repo.find("Warszawa") == []
    assert repo.find("Pusta") == []


def test_missing_files(tmp_path):
    assert ObserwatorRepository(tmp_path / "brak.csv").find("Drwinia") == []


@pytest.fixture
def chat_with_repo(repo):
    app.dependency_overrides[get_obserwator_repository] = lambda: repo
    yield
    app.dependency_overrides.pop(get_obserwator_repository, None)


async def test_chat_tool_emits_gmina_stats(client, fake_llm, chat_with_repo):
    llm = fake_llm(
        [
            [tool("gmina_stats", gmina="Bochnia")],
            [tool("propose_summary", summary="Seniorzy w Bochni.")],
        ]
    )
    events = await post(client, first_message("Jestem z Bochni"))

    assert [n for n, _ in events] == ["gmina_stats", "summary", "done"]
    stats = events[0][1]
    assert stats["gmina"] == "Bochnia"
    assert [o["nazwa"] for o in stats["obszary"]] == ["Bochnia (miasto)", "Bochnia (wieś)"]
    assert stats["obszary"][0]["wskazniki"][0]["wartosc"] == "28339"
    assert "[Dane gminy: Bochnia (miasto), Bochnia (wieś)]" in events[-1][1]["assistant_message"]
    tool_result = llm.calls[1][-1]
    assert "28339" in json.dumps(tool_result, ensure_ascii=False)


async def test_chat_tool_unknown_gmina(client, fake_llm, chat_with_repo):
    llm = fake_llm(
        [
            [tool("gmina_stats", gmina="Warszawa")],
            [tool("propose_summary", summary="Seniorzy.")],
        ]
    )
    events = await post(client, first_message())

    assert [n for n, _ in events] == ["summary", "done"]
    assert "Brak danych dla „Warszawa”" in json.dumps(llm.calls[1][-1], ensure_ascii=False)
