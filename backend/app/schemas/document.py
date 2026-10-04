from typing import Literal

from pydantic import BaseModel

from app.schemas.innovation import Innovation

DocumentType = Literal["raport", "publikacja", "mapa-wyzwan", "wskaznik"]


class Document(BaseModel):
    """Dokument ROPS w Zasobniku (ADR 0004 §9). Pola zależne od typu mogą być null."""

    id: str
    typ: DocumentType
    tytul: str
    opis: str | None
    rok: int | None
    # Strona albo PDF na rops.krakow.pl - same PDF-y nie są w repo.
    url_zrodlowy: str
    # Tylko gdy ROPS ją podaje (zadanie 0014), inaczej null.
    licencja: str | None
    strony: int | None
    # Rozmiar pliku podany przez ROPS, np. „15.41 MB” (do etykiety linku do PDF).
    rozmiar: str | None
    # Wskaźniki Obserwatora: kategoria i pierwotne źródło danych (np. GUS).
    kategoria: str | None
    zrodlo_danych: str | None


class DocumentDetail(Document):
    # Tekst wyciągnięty z PDF (Markdown, strony rozdziela `<!-- page N -->`); przy wskaźniku
    # opis i tabela powiatów. Dostępna alternatywa dla PDF.
    tresc: str | None


class DocumentSearchHit(BaseModel):
    dokument: Document
    # Fragment treści z trafieniem (zwykły tekst); null, gdy słowa są tylko w tytule lub opisie.
    fragment: str | None
    # Pozycje trafień w `fragment`: [początek, koniec) w znakach.
    trafienia: list[tuple[int, int]]
    # Strona PDF, na której jest fragment; null bez znaczników stron.
    strona: int | None
    # Znaleziony po znaczeniu (ADR 0016), nie po wpisanych słowach.
    po_znaczeniu: bool = False


class InnovationSearchHit(BaseModel):
    innowacja: Innovation
    po_znaczeniu: bool = False


class SearchResults(BaseModel):
    """Wspólne wyszukiwanie Zasobnika: dokumenty i karty innowacji, każde od najtrafniejszego."""

    dokumenty: list[DocumentSearchHit]
    innowacje: list[InnovationSearchHit]
