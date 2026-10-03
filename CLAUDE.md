# CLAUDE.md

## Stack

- Backend: Python 3.12, FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic, uv
- Baza: PostgreSQL 16
- Frontend: React 19, TypeScript, Vite, react-router, serwowany przez nginx
- Uruchamianie: Docker Compose (`docker compose up --build`)

## Zasady

- Backend: endpoint -> service -> repository -> model.
- Stan prac: `docs/status.md`. Zadania: `docs/tasks/`, decyzje: `docs/adr/` (nowy plik z `0000-template.md`, kolejny numer).
