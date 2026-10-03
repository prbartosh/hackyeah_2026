from __future__ import annotations

from app.repositories.innovation import InnovationRepository
from app.schemas.innovation import Category, Innovation


class InnovationService:
    def __init__(self, repo: InnovationRepository) -> None:
        self.repo = repo

    def list(self, kategoria: str | None, q: str | None, wybrane: bool) -> list[Innovation]:
        return self.repo.list(kategoria=kategoria, q=q, wybrane=wybrane)

    def categories(self) -> list[Category]:
        return self.repo.categories()
