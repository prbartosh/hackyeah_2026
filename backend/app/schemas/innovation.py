from pydantic import BaseModel


class Innovation(BaseModel):
    """Rekord z assets/innowacje-spoleczne/innowacje.json (opis pól: docs/baza-innowacji.md)."""

    slug: str
    url_zrodlowy: str
    nazwa: str
    kategorie: list[str]
    wybrana_do_upowszechniania: bool
    opis: str | None
    problem: str
    grupa_docelowa: str | None
    kto_moze_skorzystac: str
    czy_dziala: str | None
    organizacja: str | None
    pdf_url: str | None
    youtube_url: str | None
    materialy_url: str
    obraz_url: str
    licencja: str | None
    pobrano_dnia: str
