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
| Nikodem | produkt i demo (razem z Wiktorem) |
| Wiktor | produkt i demo (razem z Nikodemem) |

Każde zadanie w `docs/tasks/` ma w polu „Osoba” imię osoby, która się nim zajmuje.

## Zasady

- Pisz prosty, czytelny i bezpieczny kod. Bez przerostu formy.
- Nie masz 100% pewności: pytaj. Nie zgaduj.
- Python: `uv`, instalacja przez `uv pip install`.
- Backend: endpoint -> service -> repository -> model.
- Stan prac: `docs/status.md`. Zadania: `docs/tasks/`, decyzje: `docs/adr/` (nowy plik z `0000-template.md`, kolejny numer).

## Pull requesty

- Tytuł i opis PR piszemy po polsku.
- Przed każdym PR aktualizujemy stan zadań: status i checkboxy w `docs/tasks/`, listy w `docs/status.md`. Aktualizacja wchodzi do tego samego PR.
