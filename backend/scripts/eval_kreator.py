"""Ewaluacja „Takie rozwiązania już działają” (kreator) na zestawie testowym (zadanie 0048).

Liczy to samo co `FiszkaService.similar_to_text`: `rank_cards` (tagi i TF-IDF) i `pick_similar`,
na kartach z plików (bez bazy). Treść zgłoszenia z docs/zestaw-testowy.md to opis pomysłu.

Użycie (z katalogu backend/):
    python scripts/eval_kreator.py                 # bez Jeva (dzisiejszy wynik, bez sieci)
    python scripts/eval_kreator.py --jev           # z Jevem (płatne, wymaga TYPESAFE_API_KEY)
    python scripts/eval_kreator.py --jev --sweep   # przegląd progów i wag z zapisanych ocen

Oceny Jeva trafiają do pliku .cache/eval_kreator.json (kolejne przebiegi i przegląd progów nie
pytają API ponownie). --fresh pomija ten plik. Koszt pełnego przebiegu: ok. 300 zapytań,
poniżej 0,05 $.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import sys
import time
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
# Skrypt nie używa bazy, ale ustawienia aplikacji wymagają adresu.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://nieuzywane/nieuzywane")

from app.core.config import Settings  # noqa: E402
from app.models import InnovationCard  # noqa: E402
from app.repositories.innovation import (  # noqa: E402  # noqa: E402
    OVERLAY_FILE,
    OVERLAY_LISTS,
    VOCABULARY_FILE,
    _load,
    _load_overlay,
)
from app.services import relevance  # noqa: E402
from app.services.cards import rank_cards  # noqa: E402
from app.services.jev import (  # noqa: E402  # noqa: E402
    Answers,
    ChoiceAnswer,
    Judge,
    Question,
    ScoreAnswer,
    TypeSafeJudge,
    _payload,
)
from app.services.matching import labels, load_vocabulary, tag_text  # noqa: E402
from scripts.eval_matchmaking import TEST_SET, Case, parse_cases  # noqa: E402

DATA = Path(__file__).resolve().parents[2] / "assets" / "innowacje-spoleczne" / "innowacje.json"
CACHE = Path(__file__).resolve().parents[1] / ".cache" / "eval_kreator.json"
# Domyślny próg z panelu (`prog_dopasowania`), używany bez Jeva.
PANEL_THRESHOLD = 0.30
MAX_SIMILAR = 3
ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
SWEEP_WEIGHTS = (
    (0.5, 0.3, 0.2),
    (0.6, 0.3, 0.1),
    (0.4, 0.4, 0.2),
    (1.0, 0.0, 0.0),
    (0.0, 1.0, 0.0),
)
SWEEP_THRESHOLDS = (0.25, 0.3, 0.32, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6)


def load_cards() -> list[InnovationCard]:
    """Opublikowane karty jak po imporcie z plików (`CardService.import_from_files`)."""
    records = _load(DATA)
    overlays = _load_overlay(
        DATA.parent / OVERLAY_FILE, frozenset(records), DATA.parent / VOCABULARY_FILE
    )
    cards = []
    for slug, r in records.items():
        overlay = overlays.get(slug, {})
        cards.append(
            InnovationCard(
                slug=slug,
                status="opublikowana",
                nakladka={k: overlay[k] for k in OVERLAY_LISTS if overlay.get(k)} or None,
                **r.model_dump(exclude={"slug"}),
            )
        )
    return cards


class FileCacheJudge:
    """Odpowiedzi Jeva z pliku; brakujące pyta API i dopisuje. Liczy zapytania i tokeny."""

    def __init__(self, judge: Judge | None, path: Path, fresh: bool) -> None:
        self.judge = judge
        self.path = path
        self.data: dict[str, dict] = {}
        if path.exists() and not fresh:
            self.data = json.loads(path.read_text(encoding="utf-8"))
        self.calls = 0
        self.tokens = 0
        self.model = ""

    async def evaluate(self, state, questions: dict[str, Question]) -> Answers:
        body = {"state": state, "questions": {k: _payload(q) for k, q in questions.items()}}
        key = hashlib.sha1(json.dumps(body, ensure_ascii=False).encode()).hexdigest()
        if key not in self.data:
            if self.judge is None:
                raise SystemExit("Brak oceny w pliku cache, a nie ma TYPESAFE_API_KEY.")
            answers = await self.judge.evaluate(state, questions)
            self.calls += 1
            self.tokens += answers.input_tokens
            self.model = answers.model
            self.data[key] = {
                "nouls": answers.nouls,
                "scores": {k: asdict(v) for k, v in answers.scores.items()},
                "choices": {k: asdict(v) for k, v in answers.choices.items()},
                "model": answers.model,
            }
        raw = self.data[key]
        self.model = self.model or raw.get("model", "")
        return Answers(
            nouls=raw["nouls"],
            scores={k: ScoreAnswer(**v) for k, v in raw["scores"].items()},
            choices={k: ChoiceAnswer(**v) for k, v in raw["choices"].items()},
        )

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.data, ensure_ascii=False), encoding="utf-8")


def api_key() -> str | None:
    """TYPESAFE_API_KEY ze zmiennej środowiskowej albo z głównego .env (bez drukowania)."""
    if os.environ.get("TYPESAFE_API_KEY"):
        return os.environ["TYPESAFE_API_KEY"]
    if ROOT_ENV.exists():
        for line in ROOT_ENV.read_text(encoding="utf-8").splitlines():
            name, _, value = line.partition("=")
            if name.strip() == "TYPESAFE_API_KEY" and value.strip():
                return value.strip().strip("\"'")
    return None


async def run_cases(
    cases: list[Case], cards: list[InnovationCard], judge: Judge | None
) -> tuple[dict[int, list[tuple[InnovationCard, object]]], dict[int, float]]:
    """Kandydaci (rank) dla każdego przypadku i ich oceny Jeva (do cache); czasy w sekundach."""
    vocabulary = load_vocabulary(DATA.parent / VOCABULARY_FILE)
    label_map = labels(vocabulary)
    ranked = {
        c.number: rank_cards(
            cards, c.text, tag_text(c.text, vocabulary), label_map, relevance.CANDIDATES + 1
        )
        for c in cases
    }
    times: dict[int, float] = {}
    if judge is not None:
        for c in cases:
            start = time.perf_counter()
            candidates = [card for card, _ in ranked[c.number][: relevance.CANDIDATES]]
            verdicts = await relevance.judge_cards(judge, c.text, candidates, timeout=60)
            if verdicts is None:
                raise SystemExit(f"Jev niedostępny przy zgłoszeniu {c.number}")
            times[c.number] = time.perf_counter() - start
    return ranked, times


async def shown_slugs(case: Case, ranked, judge: Judge | None) -> list[str]:
    picked = await relevance.pick_similar(
        case.text,
        ranked[case.number],
        judge,
        threshold=PANEL_THRESHOLD,
        limit=MAX_SIMILAR,
        timeout=60,
    )
    return [s.card.slug for s in picked]


def hit(case: Case, slugs: list[str], n: int) -> bool:
    top = slugs[: max(n, 2) if case.ambiguous and n == 1 else n]
    return case.expected is not None and case.expected in top


async def score(cases: list[Case], ranked, judge: Judge | None) -> dict[str, object]:
    shown = {c.number: await shown_slugs(c, ranked, judge) for c in cases}
    matched = [c for c in cases if c.expected]
    negative = [c for c in cases if not c.expected]
    return {
        "top1": sum(hit(c, shown[c.number], 1) for c in matched),
        "top3": sum(hit(c, shown[c.number], 3) for c in matched),
        "puste_trafne": sum(not shown[c.number] for c in matched),
        "puste_spoza": sum(not shown[c.number] for c in negative),
        "matched": len(matched),
        "negative": len(negative),
        "shown": shown,
    }


def summary(result: dict[str, object]) -> str:
    return (
        f"top 1: {result['top1']}/{result['matched']}, "
        f"top 3: {result['top3']}/{result['matched']}, "
        f"trafne bez wyniku: {result['puste_trafne']}, "
        f"spoza bazy nic nie pokazuje: {result['puste_spoza']}/{result['negative']}"
    )


async def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--jev", action="store_true", help="z Jevem (płatne)")
    parser.add_argument("--sweep", action="store_true", help="przegląd progów i wag")
    parser.add_argument("--fresh", action="store_true", help="bez pliku cache")
    parser.add_argument("--only", type=int, nargs="*", help="numery zgłoszeń")
    parser.add_argument("--details", action="store_true", help="wynik każdego zgłoszenia")
    args = parser.parse_args()

    cases = parse_cases(TEST_SET.read_text(encoding="utf-8"))
    if args.only:
        cases = [c for c in cases if c.number in args.only]
    cards = load_cards()

    judge = None
    cache = None
    if args.jev:
        key = api_key()
        settings = Settings(typesafe_api_key=key, jev_timeout_seconds=30)
        live = TypeSafeJudge(settings) if key else None
        cache = FileCacheJudge(live, CACHE, args.fresh)
        judge = cache

    ranked, times = await run_cases(cases, cards, judge)
    if cache is not None:
        cache.save()

    result = await score(cases, ranked, judge)
    label = "z Jevem" if judge else "bez Jeva"
    print(f"{label}: {summary(result)}")
    if judge and cache is not None:
        print(
            f"Jev: model {cache.model or '?'}, nowe zapytania {cache.calls}, tokeny wejścia "
            f"{cache.tokens}, koszt ok. {cache.tokens * 0.042 / 1e6:.4f} $"
        )
        if cache.calls:
            ordered = sorted(times.values())
            p50 = ordered[len(ordered) // 2]
            p95 = ordered[min(len(ordered) - 1, int(len(ordered) * 0.95))]
            print(f"czas oceny na zgłoszenie (8 par równolegle): p50 {p50:.2f} s, p95 {p95:.2f} s")
    if args.details:
        for c in cases:
            shown = result["shown"][c.number]
            ok = hit(c, shown, 1) if c.expected else not shown
            print(
                f"{'ok' if ok else '--'} #{c.number:>2} oczekiwany {c.expected or 'brak'}: {shown}"
            )
    if args.sweep and judge:
        print("\nprzegląd (wagi trafność/rozwiązuje/grupa, próg):")
        for weights in SWEEP_WEIGHTS:
            relevance.WEIGHTS = weights
            for threshold in SWEEP_THRESHOLDS:
                relevance.THRESHOLD = threshold
                print(f"  {weights} {threshold:.2f}: {summary(await score(cases, ranked, judge))}")


if __name__ == "__main__":
    asyncio.run(main())
