from pydantic import BaseModel


class Innovation(BaseModel):
    """Pola treści mogą być null (ADR 0004 §2) - pusty rekord po odświeżeniu scraperem
    nie może wywalić startu backendu.
    """

    slug: str
    url_zrodlowy: str
    nazwa: str
    kategorie: list[str]
    wybrana_do_upowszechniania: bool
    opis: str | None
    problem: str | None
    grupa_docelowa: str | None
    kto_moze_skorzystac: str | None
    czy_dziala: str | None
    organizacja: str | None
    pdf_url: str | None
    youtube_url: str | None
    materialy_url: str | None
    obraz_url: str | None
    licencja: str | None
    pobrano_dnia: str | None


class Category(BaseModel):
    slug: str
    nazwa: str
    liczba_innowacji: int
