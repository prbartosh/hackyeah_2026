from __future__ import annotations

from app.repositories.document import DocumentRepository
from app.schemas.document import Document, DocumentDetail, DocumentSearchHit, DocumentType


class KnowledgeService:
    """Dokumenty Zasobnika wiedzy. Nazwa inna niż `documents.py` (import dokumentów do kart)."""

    def __init__(self, repo: DocumentRepository) -> None:
        self.repo = repo

    def list(self, typ: DocumentType | None, rok: int | None, q: str | None) -> list[Document]:
        return self.repo.list(typ=typ, rok=rok, q=q)

    def get(self, doc_id: str) -> DocumentDetail | None:
        return self.repo.get(doc_id)

    def search(self, q: str, limit: int) -> list[DocumentSearchHit]:
        return [
            DocumentSearchHit(
                dokument=h.document, fragment=h.fragment, trafienia=h.highlights, strona=h.strona
            )
            for h in self.repo.search(q, limit)
        ]
