import csv
import sys
from pathlib import Path

import pytest

SCRAPERS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRAPERS))

import obserwator  # noqa: E402
import raporty  # noqa: E402


def test_missing_expected_observer_table_is_a_parse_error():
    with pytest.raises(obserwator.ParseError, match="Brak tabeli danych"):
        obserwator.parse("<html><body>zmieniony układ</body></html>", "12", "Test", "2024")


def test_header_only_observer_csv_is_not_a_completed_cache(tmp_path):
    path = tmp_path / "12.csv"
    with path.open("w", newline="", encoding="utf-8") as file:
        csv.writer(file).writerow(obserwator.FIELDS)

    assert not obserwator.csv_has_data(path)

    with path.open("a", newline="", encoding="utf-8") as file:
        csv.writer(file).writerow(["12", "Test", "2024", "powiat", "Kraków", "Kraków", "1"])

    assert obserwator.csv_has_data(path)


def test_limited_observer_run_does_not_replace_global_outputs(monkeypatch, tmp_path):
    scraped = []
    monkeypatch.setattr(obserwator, "OUT", tmp_path)
    monkeypatch.setattr(
        obserwator,
        "indicator_list",
        lambda: [{"id": "1", "name": "Jeden"}, {"id": "2", "name": "Dwa"}],
    )
    monkeypatch.setattr(obserwator, "scrape", lambda indicator: scraped.append(indicator["id"]))
    monkeypatch.setattr(
        obserwator,
        "write_json",
        lambda *_: pytest.fail("limited run must not write indicators.json"),
    )
    monkeypatch.setattr(
        obserwator,
        "merge",
        lambda *_: pytest.fail("limited run must not replace observations.csv"),
    )

    obserwator.main(1)

    assert scraped == ["1"]


def test_report_page_count_is_recovered_from_existing_markdown(tmp_path):
    path = tmp_path / "report.md"
    path.write_text("<!-- page 1 -->\nA\n<!-- page 3 -->\nC", encoding="utf-8")

    assert raporty.markdown_page_count(path) == 3
