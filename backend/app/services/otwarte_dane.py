from __future__ import annotations

import csv
import io
from typing import Any

from app.repositories.document import DocumentRepository
from app.repositories.innovation import InnovationRepository

# Licencji nie nadajemy: pole `licencja` jest wypełnione tylko tam, gdzie podaje ją ROPS.
ZRODLO = "ROPS Kraków"

INNOVATION_COLUMNS = [
    "slug",
    "nazwa",
    "kategorie",
    "problem",
    "grupa_docelowa",
    "kto_moze_skorzystac",
    "organizacja",
    "wybrana_do_upowszechniania",
    "url_splot",
    "url_zrodlowy",
    "licencja",
    "zrodlo",
]
DOCUMENT_COLUMNS = [
    "id",
    "typ",
    "tytul",
    "opis",
    "rok",
    "kategoria",
    "zrodlo_danych",
    "url_splot",
    "url_zrodlowy",
    "licencja",
    "zrodlo",
]


def _csv_cell(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        value = ", ".join(value)
    if isinstance(value, bool):
        return "tak" if value else "nie"
    text = str(value)
    # Excel wykonuje komórki zaczynające się od tych znaków jak formuły.
    return "'" + text if text[:1] in ("=", "+", "-", "@") else text


def to_csv(rows: list[dict[str, Any]], columns: list[str]) -> bytes:
    """UTF-8 z BOM i `;`: tak Excel w polskim układzie poprawnie czyta polskie znaki."""
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";", lineterminator="\r\n")
    writer.writerow(columns)
    for row in rows:
        writer.writerow(_csv_cell(row[c]) for c in columns)
    return buffer.getvalue().encode("utf-8-sig")


class OpenDataService:
    """Eksport publicznych pól tych samych danych, które zwracają `/innovations` i `/documents`."""

    def __init__(
        self, innovations: InnovationRepository, documents: DocumentRepository, base_url: str
    ) -> None:
        self.innovations = innovations
        self.documents = documents
        self.base_url = base_url.rstrip("/")

    def innovation_rows(self) -> list[dict[str, Any]]:
        return [
            {
                "slug": i.slug,
                "nazwa": i.nazwa,
                "kategorie": i.kategorie,
                "problem": i.problem,
                "grupa_docelowa": i.grupa_docelowa,
                "kto_moze_skorzystac": i.kto_moze_skorzystac,
                "organizacja": i.organizacja,
                "wybrana_do_upowszechniania": i.wybrana_do_upowszechniania,
                "url_splot": f"{self.base_url}/innowacja/{i.slug}",
                "url_zrodlowy": i.url_zrodlowy,
                "licencja": i.licencja,
                "zrodlo": ZRODLO,
            }
            for i in self.innovations.list(kategoria=None, q=None, wybrane=False)
        ]

    def document_rows(self) -> list[dict[str, Any]]:
        return [
            {
                "id": d.id,
                "typ": d.typ,
                "tytul": d.tytul,
                "opis": d.opis,
                "rok": d.rok,
                "kategoria": d.kategoria,
                "zrodlo_danych": d.zrodlo_danych,
                "url_splot": f"{self.base_url}/dokument/{d.id}",
                "url_zrodlowy": d.url_zrodlowy,
                "licencja": d.licencja,
                "zrodlo": ZRODLO,
            }
            for d in self.documents.list()
        ]

    def summary(self) -> dict[str, int]:
        innovations, documents = self.innovation_rows(), self.document_rows()
        return {
            "innowacje": len(innovations),
            "innowacje_z_licencja": sum(1 for r in innovations if r["licencja"]),
            "dokumenty": len(documents),
            "dokumenty_z_licencja": sum(1 for r in documents if r["licencja"]),
        }
