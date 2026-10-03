from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.chat import ProblemState

TODO = "do uzupełnienia"

# Mieszkaniec nie wdraża innowacji u siebie, więc karta jest tylko dla instytucji (ADR 0009).
ServiceCardRole = Literal["cus-ops", "partner"]


class ServiceCardRequest(BaseModel):
    rola: ServiceCardRole
    # Stan problemu z czatu, jeśli użytkownik przyszedł z wyników. Front trzyma go w przeglądarce.
    problem: ProblemState | None = None


class ServiceCard(BaseModel):
    """Karta usługi: jak wdrożyć innowację u siebie. Brakujące dane = „do uzupełnienia”."""

    cel: str = Field(min_length=1)
    odbiorcy: str = Field(min_length=1)
    kroki: list[str] = Field(min_length=3, max_length=7)
    zasoby: list[str] = Field(min_length=1)
    ryzyka: list[str] = Field(min_length=1)
    wskazniki_sukcesu: list[str] = Field(min_length=1)


class ServiceCardResponse(BaseModel):
    slug: str
    nazwa: str
    rola: ServiceCardRole
    karta: ServiceCard
