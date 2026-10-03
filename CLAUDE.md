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

## Zadania

Nagłówek zadania w `docs/tasks/` to jedyne źródło prawdy o jego stanie. Stałe pola, stałe wartości:

```
- Status: todo | w toku | review | zablokowane | zrobione
- Osoba: Bartłomiej
- PR: #15
- Blokada: brak OPENAI_API_KEY
```

- `Status`: tylko jedna z wartości powyżej, bez dopisków. Postęp opisują checkboxy w „Kroki”, komentarze idą do „Notatki”.
- `PR`: numery PR-ów zadania, po przecinku. Puste, dopóki nie ma PR.
- `Blokada`: tylko przy `zablokowane`, krótko na co czekamy.

## Zasady

- Pisz prosty, czytelny i bezpieczny kod. Bez przerostu formy.
- Nie masz 100% pewności: pytaj. Nie zgaduj.
- Python: `uv`, instalacja przez `uv pip install`.
- Backend: endpoint -> service -> repository -> model.
- Stan prac: `docs/status.md`. Zadania: `docs/tasks/`, decyzje: `docs/adr/` (nowy plik z `0000-template.md`, kolejny numer).

## Pull requesty

- Tytuł i opis PR piszemy po polsku.
- Branch zaczyna się od numeru zadania: `0012-middleman`. Tytuł PR też: `[0012] Middleman innowacji`. PR do kilku zadań: `[0003, 0005] ...`. PR bez zadania (np. drobne porządki): bez prefiksu.
- Po otwarciu PR wpisz jego numer w pole `PR` zadania i ustaw `Status: review`.
- Przed każdym PR aktualizujemy stan zadań: status i checkboxy w `docs/tasks/`, listy w `docs/status.md`. Aktualizacja wchodzi do tego samego PR.
