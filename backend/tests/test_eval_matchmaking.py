import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from eval_matchmaking import (  # noqa: E402
    TEST_SET,
    Case,
    Outcome,
    append_result,
    outcome_from_events,
    parse_cases,
    parse_sse,
    summary,
)


def case(expected: str | None = "a", ambiguous: bool = False) -> Case:
    return Case(number=1, role="partner", text="x", expected=expected, ambiguous=ambiguous)


@pytest.mark.skipif(not TEST_SET.exists(), reason="docs/ nie jest montowane w kontenerze")
def test_parse_real_test_set():
    cases = parse_cases(TEST_SET.read_text(encoding="utf-8"))
    assert [c.number for c in cases] == list(range(1, 29))
    assert cases[0].role == "mieszkaniec"
    assert cases[0].expected == "kody-qr-na-pomoc-seniorom"
    assert cases[9].ambiguous and cases[9].expected == "dialog-ponad-kulturami-1"
    assert not cases[0].ambiguous
    assert cases[27].expected is None


def test_parse_sse():
    lines = [
        "event: text",
        'data: {"text": "Szukam"}',
        "",
        "event: results",
        'data: {"no_good_match": false, "note": null, "items": [{"slug": "a"}, {"slug": "b"}]}',
        "",
    ]
    events = parse_sse(lines)
    assert [name for name, _ in events] == ["text", "results"]
    outcome = outcome_from_events(case(), events)
    assert outcome.slugs == ["a", "b"] and outcome.error is None


def test_error_event_and_missing_results():
    assert outcome_from_events(case(), [("error", {"message": "x"})]).error == "x"
    assert outcome_from_events(case(), [("text", {"text": "y"})]).error


def test_scoring():
    assert Outcome(case(), slugs=["a", "b"]).top1
    assert not Outcome(case(), slugs=["b", "a"]).top1
    assert Outcome(case(ambiguous=True), slugs=["b", "a"]).top1
    assert Outcome(case(), slugs=["b", "c", "d", "e", "a"]).top5
    assert Outcome(case(expected=None), no_good_match=True).no_match_ok
    assert not Outcome(case(expected=None), no_good_match=False).no_match_ok


def test_summary():
    outcomes = [
        Outcome(case(), slugs=["a"]),
        Outcome(case(), slugs=["b", "a"]),
        Outcome(case(), error="boom"),
        Outcome(case(expected=None), no_good_match=True),
    ]
    assert summary(outcomes) == "top 1: 1/3, top 5: 2/3, brak dopasowania: 1/1, błędy: 1"


def test_append_result_creates_and_extends_section(tmp_path):
    path = tmp_path / "zestaw.md"
    path.write_text("# Zestaw\n\n## Sposób użycia\n\n- tekst\n", encoding="utf-8")
    append_result(path, "- wynik 1")
    append_result(path, "- wynik 2")
    assert path.read_text(encoding="utf-8").endswith("## Wyniki\n\n- wynik 1\n- wynik 2\n")


def test_append_result_before_next_section(tmp_path):
    path = tmp_path / "zestaw.md"
    path.write_text("## Wyniki\n\n- stary\n\n## Inne\n\ntekst\n", encoding="utf-8")
    append_result(path, "- nowy")
    assert path.read_text(encoding="utf-8") == (
        "## Wyniki\n\n- stary\n- nowy\n\n## Inne\n\ntekst\n"
    )
