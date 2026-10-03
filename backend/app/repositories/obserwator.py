import csv
import json
import logging
import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

SELECTION_FILE = "wskazniki-czatu.json"
SOURCE_URL = "https://obserwator.rops.krakow.pl/differenceanalysis/{id}"

# Gminy miejsko-wiejskie mają osobne wiersze: „Bochnia (miasto)”, „Bochnia (wieś)”.
PART_SUFFIX = re.compile(r"\s*\((miasto|wieś)\)$")
# Miasta na prawach powiatu są w danych tylko jako powiat: „powiat m. Kraków”.
CITY_POWIAT = re.compile(r"^powiat m\. ")
NAME_PREFIX = re.compile(r"^(gmina|gm\.|miasto|m\.)\s+")


@dataclass(frozen=True)
class Wskaznik:
    id: str
    nazwa: str
    wartosc: str
    rok: str
    zrodlo: str
    url: str


@dataclass
class Obszar:
    nazwa: str
    powiat: str
    wskazniki: list[Wskaznik] = field(default_factory=list)


def normalize(name: str) -> str:
    """Nazwa do porównań: bez polskich znaków, wielkości liter i przedrostka „gmina”."""
    name = name.strip().lower().replace("ł", "l")
    name = "".join(c for c in unicodedata.normalize("NFKD", name) if not unicodedata.combining(c))
    name = " ".join(name.replace("-", " ").split())
    return NAME_PREFIX.sub("", name)


def _area_key(area: str, level: str) -> str | None:
    if level == "gmina":
        return normalize(PART_SUFFIX.sub("", area))
    if CITY_POWIAT.match(area):
        return normalize(CITY_POWIAT.sub("", area))
    return None


def _format_value(value: str) -> str:
    return value.replace(".", ",")


@lru_cache
def _load(csv_path: Path) -> dict[str, list[Obszar]]:
    """Indeks: znormalizowana nazwa -> obszary z najnowszą wartością każdego wskaźnika."""
    selection_path = csv_path.parent / SELECTION_FILE
    if not csv_path.exists() or not selection_path.exists():
        logger.warning("Obserwator: brak %s albo %s, dane gmin wyłączone", csv_path, SELECTION_FILE)
        return {}
    selected = {i["id"]: i for i in json.loads(selection_path.read_text(encoding="utf-8"))}

    # (obszar, powiat) -> id wskaźnika -> (rok, wartość) z najnowszego roku z wartością
    latest: dict[tuple[str, str], dict[str, tuple[str, str]]] = defaultdict(dict)
    keys: dict[tuple[str, str], str] = {}
    with csv_path.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if row["indicator_id"] not in selected or not row["value"]:
                continue
            key = _area_key(row["area"], row["level"])
            if key is None:
                continue
            area = (row["area"], row["powiat"])
            keys[area] = key
            current = latest[area].get(row["indicator_id"])
            if current is None or row["year"] > current[0]:
                latest[area][row["indicator_id"]] = (row["year"], row["value"])

    index: dict[str, list[Obszar]] = defaultdict(list)
    for (area, powiat), values in sorted(latest.items()):
        obszar = Obszar(nazwa=area, powiat=powiat)
        for indicator_id, meta in selected.items():
            if indicator_id not in values:
                continue
            rok, wartosc = values[indicator_id]
            obszar.wskazniki.append(
                Wskaznik(
                    id=indicator_id,
                    nazwa=meta["nazwa"],
                    wartosc=_format_value(wartosc),
                    rok=rok,
                    zrodlo=meta["zrodlo"],
                    url=SOURCE_URL.format(id=indicator_id),
                )
            )
        index[keys[(area, powiat)]].append(obszar)
    logger.info("Obserwator: %s obszarów, %s wskaźników", len(latest), len(selected))
    return dict(index)


class ObserwatorRepository:
    """Wybrane wskaźniki gmin z Obserwatora Statystyk Społecznych ROPS (assets/obserwator)."""

    def __init__(self, csv_path: Path) -> None:
        self._index = _load(csv_path)

    def find(self, name: str) -> list[Obszar]:
        """Wszystkie obszary o tej nazwie: miasto i gmina wiejska, gminy z dwóch powiatów."""
        return self._index.get(normalize(PART_SUFFIX.sub("", name)), [])
