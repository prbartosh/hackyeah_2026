"""Ewaluacja dopasowania czatu na zestawie testowym (zadanie 0009).

Dla każdego zgłoszenia z docs/zestaw-testowy.md wysyła jedną wiadomość z rolą
(state.rola + role_locked) i akcją show_results_now, bez rund pytań, i sprawdza,
na którym miejscu jest oczekiwany slug.

Użycie (z katalogu backend/, stack uruchomiony przez docker compose):
    python scripts/eval_matchmaking.py                    # pełny przebieg, wynik do „Wyniki”
    python scripts/eval_matchmaking.py --only 1 4         # wybrane zgłoszenia, bez zapisu
    python scripts/eval_matchmaking.py --note "prompt v2"  # opis przebiegu w linii wyniku

Każde zgłoszenie to rozmowa na prawdziwym modelu (płatne). Zużycie tokenów: logi
backendu („LLM turn”). Rozmowy idą po kolei z przerwą (--pause), bo bez niej przebieg
przekracza limit tokenów na minutę w OpenAI. Pełny przebieg trwa ok. 15 minut.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import httpx

TEST_SET = Path(__file__).resolve().parents[2] / "docs" / "zestaw-testowy.md"
DEFAULT_URL = "http://localhost:8000/api/v1/chat"
TIMEOUT_S = 180
# Limit OpenAI 500 tys. tokenów/min liczy też cache; rozmowa to ok. 130 tys. (3 × 43 tys.).
DEFAULT_PAUSE_S = 20
RESULTS_HEADER = "## Wyniki"
SLUG = re.compile(r"`([a-z0-9-]+)`")


@dataclass
class Case:
    number: int
    role: str
    text: str
    expected: str | None  # None = oczekiwany brak dopasowania
    ambiguous: bool


@dataclass
class Outcome:
    case: Case
    slugs: list[str] = field(default_factory=list)
    no_good_match: bool = False
    error: str | None = None

    @property
    def top1(self) -> bool:
        # Pozycje niejednoznaczne liczą się też na 2. miejscu.
        top = self.slugs[: 2 if self.case.ambiguous else 1]
        return self.case.expected is not None and self.case.expected in top

    @property
    def top5(self) -> bool:
        return self.case.expected is not None and self.case.expected in self.slugs[:5]

    @property
    def no_match_ok(self) -> bool:
        return self.case.expected is None and self.no_good_match and self.error is None


def parse_cases(markdown: str) -> list[Case]:
    cases: list[Case] = []
    for line in markdown.splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) != 5 or not cells[0].isdigit():
            continue
        number, role, text, expected_cell, notes = cells
        match = SLUG.search(expected_cell)
        expected = None if expected_cell.startswith("brak") or not match else match.group(1)
        cases.append(
            Case(
                number=int(number),
                role=role,
                text=text,
                expected=expected,
                ambiguous="niejednoznaczne" in notes,
            )
        )
    return cases


def parse_sse(lines: list[str]) -> list[tuple[str, dict]]:
    """Backend wysyła jedną linię `data` na zdarzenie."""
    events: list[tuple[str, dict]] = []
    name = None
    for line in lines:
        if line.startswith("event: "):
            name = line.removeprefix("event: ")
        elif line.startswith("data: ") and name:
            events.append((name, json.loads(line.removeprefix("data: "))))
            name = None
    return events


def outcome_from_events(case: Case, events: list[tuple[str, dict]]) -> Outcome:
    outcome = Outcome(case=case)
    for name, data in events:
        if name == "results":
            outcome.slugs = [item["slug"] for item in data["items"]]
            outcome.no_good_match = data["no_good_match"]
            return outcome
        if name == "error":
            outcome.error = data["message"]
            return outcome
    outcome.error = "brak zdarzenia results"
    return outcome


def run_case(client: httpx.Client, url: str, case: Case) -> Outcome:
    payload = {
        "messages": [{"role": "user", "content": case.text}],
        "state": {"rola": case.role, "role_locked": True},
        "action": "show_results_now",
    }
    with client.stream("POST", url, json=payload) as response:
        if response.status_code == 503:
            # Budżet dzienny lub wyłącznik (zadanie 0006): dalsze zgłoszenia nie mają sensu.
            response.read()
            sys.exit(f"Czat niedostępny (503): {response.text}")
        if response.status_code != 200:
            response.read()
            return Outcome(case=case, error=f"HTTP {response.status_code}: {response.text[:200]}")
        return outcome_from_events(case, parse_sse(list(response.iter_lines())))


def report(outcomes: list[Outcome]) -> str:
    rows = [
        "| # | Oczekiwany | Otrzymane | Top 1 | Top 5 |",
        "|---|---|---|---|---|",
    ]
    for o in outcomes:
        expected = o.case.expected or "brak"
        if o.error:
            got = f"BŁĄD: {o.error}"
        else:
            got = ", ".join(o.slugs) or "-"
            if o.no_good_match:
                got += " (no_good_match)"
        if o.case.expected is None:
            top1 = top5 = "tak" if o.no_match_ok else "nie"
        else:
            top1, top5 = ("tak" if o.top1 else "nie"), ("tak" if o.top5 else "nie")
        rows.append(f"| {o.case.number} | {expected} | {got} | {top1} | {top5} |")
    return "\n".join(rows) + "\n\n" + summary(outcomes)


def summary(outcomes: list[Outcome]) -> str:
    matched = [o for o in outcomes if o.case.expected is not None]
    no_match = [o for o in outcomes if o.case.expected is None]
    errors = sum(1 for o in outcomes if o.error)
    parts = [
        f"top 1: {sum(o.top1 for o in matched)}/{len(matched)}",
        f"top 5: {sum(o.top5 for o in matched)}/{len(matched)}",
    ]
    if no_match:
        parts.append(f"brak dopasowania: {sum(o.no_match_ok for o in no_match)}/{len(no_match)}")
    parts.append(f"błędy: {errors}")
    return ", ".join(parts)


def append_result(path: Path, line: str) -> None:
    text = path.read_text(encoding="utf-8")
    if RESULTS_HEADER not in text:
        text = text.rstrip("\n") + f"\n\n{RESULTS_HEADER}\n"
    start = text.index(RESULTS_HEADER)
    end = text.find("\n## ", start + len(RESULTS_HEADER))
    end = len(text) if end == -1 else end + 1
    section = text[start:end].rstrip("\n")
    separator = "\n\n" if section == RESULTS_HEADER else "\n"
    section += separator + line + "\n"
    rest = text[end:]
    path.write_text(text[:start] + section + ("\n" + rest if rest else ""), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--only", type=int, nargs="+", help="numery zgłoszeń; bez zapisu wyniku")
    parser.add_argument("--note", default="", help="opis przebiegu, np. zmiana promptu")
    parser.add_argument(
        "--pause", type=float, default=DEFAULT_PAUSE_S, help="sekundy przerwy między rozmowami"
    )
    args = parser.parse_args()

    cases = parse_cases(TEST_SET.read_text(encoding="utf-8"))
    if args.only:
        cases = [c for c in cases if c.number in args.only]
    if not cases:
        sys.exit("Brak zgłoszeń do sprawdzenia")

    outcomes: list[Outcome] = []
    with httpx.Client(timeout=TIMEOUT_S) as client:
        for index, case in enumerate(cases, 1):
            if index > 1:
                time.sleep(args.pause)
            print(f"[{index}/{len(cases)}] #{case.number} {case.role}", file=sys.stderr)
            try:
                outcomes.append(run_case(client, args.url, case))
            except httpx.HTTPError as e:
                outcomes.append(Outcome(case=case, error=f"{type(e).__name__}: {e}"))

    print(report(outcomes))

    if not args.only:
        stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        note = f" ({args.note})" if args.note else ""
        append_result(TEST_SET, f"- {stamp}{note}: {summary(outcomes)}")
        print(f"\nZapisano w {TEST_SET.name}, sekcja „Wyniki”.", file=sys.stderr)


if __name__ == "__main__":
    main()
