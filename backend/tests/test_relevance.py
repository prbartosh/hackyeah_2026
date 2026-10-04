"""Reranking kart przez Jeva w kreatorze (ADR 0016), fałszywy port bez sieci."""

import asyncio

import pytest

from app.api.deps import get_judge
from app.main import app
from app.models import InnovationCard
from app.services import relevance
from app.services.jev import Answers, JudgeError, ScoreAnswer
from app.services.matching import CardMatch
from app.services.relevance import pick_similar

API = "/api/v1"


class FakeJudge:
    """Oceny według nazwy karty: nazwa -> (trafność 0-4, rozwiązuje, grupa)."""

    def __init__(self, verdicts: dict[str, tuple[float, float, float]], error=None, delay=0.0):
        self.verdicts = verdicts
        self.error = error
        self.delay = delay
        self.states: list[dict] = []

    async def evaluate(self, state, questions):
        self.states.append(state)
        if self.delay:
            await asyncio.sleep(self.delay)
        if self.error:
            raise self.error
        score, solves, group = self.verdicts[state["innowacja"]["nazwa"]]
        return Answers(
            nouls={"rozwiazuje": solves, "grupa": group},
            scores={"trafnosc": ScoreAnswer(score, 1.0, 4)},
        )


@pytest.fixture(autouse=True)
def empty_cache():
    relevance._cache.clear()
    yield
    relevance._cache.clear()


def card(name: str) -> InnovationCard:
    return InnovationCard(slug=name.lower(), nazwa=name, problem=f"Problem {name}")


def ranked(*items: tuple[str, float, list[str]]) -> list[tuple[InnovationCard, CardMatch]]:
    return [(card(name), CardMatch(score=score, powody=powody)) for name, score, powody in items]


async def pick(candidates, judge, threshold=0.3):
    return await pick_similar(
        "opis potrzeby", candidates, judge, threshold=threshold, limit=3, timeout=1.0
    )


async def test_bez_jeva_wynik_deterministyczny_z_progiem_panelu():
    found = await pick(ranked(("A", 0.6, ["Seniorzy"]), ("B", 0.2, [])), None)
    assert [(s.card.slug, s.score, s.powody) for s in found] == [("a", 0.6, ["Seniorzy"])]


async def test_jev_zmienia_kolejnosc_i_odcina_slabe_karty():
    judge = FakeJudge({"A": (1, 0.1, 0.2), "B": (4, 0.95, 0.9), "C": (0, 0.0, 0.0)})
    found = await pick(ranked(("A", 0.6, ["Seniorzy"]), ("B", 0.4, []), ("C", 0.35, [])), judge)
    assert [s.card.slug for s in found] == ["b"]
    assert found[0].powody == ["odpowiada na ten sam problem", "ta sama grupa odbiorców"]


async def test_jev_nie_dodaje_kart_spoza_kandydatow():
    judge = FakeJudge({f"K{i}": (4, 1.0, 1.0) for i in range(12)})
    candidates = ranked(*((f"K{i}", 0.5, []) for i in range(12)))
    await pick(candidates, judge)
    assert len(judge.states) == relevance.CANDIDATES


async def test_powody_z_tagow_zostaja_obok_ocen_jeva():
    judge = FakeJudge({"A": (3, 0.5, 0.85)})
    found = await pick(ranked(("A", 0.5, ["Seniorzy"])), judge)
    assert found[0].powody == ["Seniorzy", "ta sama grupa odbiorców"]


async def test_stan_dla_jeva_ma_tylko_potrzebne_pola():
    judge = FakeJudge({"A": (4, 1.0, 1.0)})
    long = InnovationCard(slug="a", nazwa="A", opis="słowo " * 1000, problem="p")
    await pick([(long, CardMatch(score=0.5))], judge)
    state = judge.states[0]
    assert state["potrzeba"] == "opis potrzeby"
    assert set(state["innowacja"]) == {
        "nazwa", "problem", "grupa_docelowa", "kto_moze_skorzystac", "czy_dziala", "opis"
    }  # fmt: skip
    assert len(state["innowacja"]["opis"]) <= 1501


async def test_awaria_jeva_daje_wynik_bez_jeva():
    judge = FakeJudge({}, error=JudgeError("Błąd API Jeva (529)"))
    found = await pick(ranked(("A", 0.6, ["Seniorzy"]), ("B", 0.2, [])), judge)
    assert [s.card.slug for s in found] == ["a"]
    assert found[0].powody == ["Seniorzy"]


async def test_przekroczenie_czasu_daje_wynik_bez_jeva():
    judge = FakeJudge({"A": (4, 1.0, 1.0)}, delay=5)
    found = await pick_similar(
        "opis", ranked(("A", 0.6, [])), judge, threshold=0.3, limit=3, timeout=0.05
    )
    assert [s.score for s in found] == [0.6]


async def test_ocena_tej_samej_pary_z_pamieci():
    judge = FakeJudge({"A": (4, 1.0, 1.0)})
    await pick(ranked(("A", 0.6, [])), judge)
    await pick(ranked(("A", 0.6, [])), judge)
    assert len(judge.states) == 1


async def test_kreator_podobne_uzywa_jeva(admin_client):
    kreator = admin_client
    for name, problem in (
        ("Mobilny punkt dla seniorów", "Samotni seniorzy na wsi nie mają kontaktu z pomocą"),
        ("Klub seniora w gminie", "Seniorzy na wsi czują się samotni i nie mają kontaktu"),
    ):
        created = await kreator.post(
            f"{API}/admin/karty",
            json={"nazwa": name, "problem": problem, "kategorie": ["dla-seniorow"]},
        )
        slug = created.json()["slug"]
        await kreator.patch(f"{API}/admin/karty/{slug}", json={"status": "opublikowana"})
    judge = FakeJudge(
        {"Mobilny punkt dla seniorów": (0, 0.05, 0.3), "Klub seniora w gminie": (4, 0.95, 0.9)}
    )
    app.dependency_overrides[get_judge] = lambda: judge
    try:
        fiszka = (
            await kreator.post(
                f"{API}/kreator/fiszki",
                json={"istota": "Mobilny punkt kontaktowy dla samotnych seniorów na wsi"},
            )
        ).json()
        body = (await kreator.get(f"{API}/kreator/fiszki/{fiszka['token']}/podobne")).json()
    finally:
        app.dependency_overrides.pop(get_judge, None)
    assert [i["nazwa"] for i in body["items"]] == ["Klub seniora w gminie"]
    assert "odpowiada na ten sam problem" in body["items"][0]["powody"]
