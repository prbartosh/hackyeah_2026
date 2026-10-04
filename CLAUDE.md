# CLAUDE.md

## Stack

- Backend: Python 3.12, FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic, uv
- Baza: PostgreSQL 16
- Frontend: React 19, TypeScript, Vite, react-router, serwowany przez nginx
- Uruchamianie: Docker Compose (`docker compose up --build`)

## Zespół

| Osoba | Obszar |
|---|---|
| Bartosz | integracja |
| Bartłomiej | backend |
| Daniel | frontend |
| Kacper | frontend |
| Nikodem | produkt i demo (z Wiktorem) |
| Wiktor | produkt i demo (z Nikodemem) |

## Zasady

- Kod prosty, czytelny, bezpieczny. Bez przerostu formy.
- Brak 100% pewności: pytaj, nie zgaduj.
- Python: `uv`, instalacja `uv pip install`.
- Model językowy tylko przez port `LLMProvider` (`backend/app/services/llm.py`): serwisy nie importują SDK dostawcy ani nie znają formatu jego API.
- Nowy publiczny endpoint zapisu: limit w `frontend/nginx.conf` w tym samym PR.
- Backend: endpoint -> service -> repository -> model.
- Dokumentacja w repo jest dla jury i nietechniczna: `README.md`, `SEDZIA.md`, `docs/`. Bez ADR, zadań i statusu prac.

## Pull requesty

- Tytuł i opis PR po polsku.
