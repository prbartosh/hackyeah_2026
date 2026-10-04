from pydantic import BaseModel, Field


class PlainLanguage(BaseModel):
    """Opis innowacji w prostym języku (ETR): krótkie zdania, bez żargonu."""

    zdania: list[str] = Field(min_length=3, max_length=12)


class PlainLanguageResponse(BaseModel):
    slug: str
    nazwa: str
    zdania: list[str]
    # Źródło treści: strona innowacji w Bibliotece ROPS.
    zrodlo: str
