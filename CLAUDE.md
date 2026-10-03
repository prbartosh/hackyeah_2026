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

Zadanie w `docs/tasks/`: pole „Osoba” = imię odpowiedzialnego.

## Zadania

Nagłówek zadania w `docs/tasks/` = jedyne źródło prawdy o stanie. Stałe pola, stałe wartości:

```
- Status: todo | w toku | review | zablokowane | zrobione
- Osoba: Bartłomiej
- PR: #15
- Blokada: brak LLM_API_KEY
```

- `Status`: tylko jedna wartość z listy, bez dopisków. Postęp: checkboxy w „Kroki”. Komentarze: „Notatki”.
- `PR`: numery PR-ów zadania, po przecinku. Puste do pierwszego PR.
- `Blokada`: tylko przy `zablokowane`, krótko na co czekamy.

## Zasady

- Kod prosty, czytelny, bezpieczny. Bez przerostu formy.
- Brak 100% pewności: pytaj, nie zgaduj.
- Python: `uv`, instalacja `uv pip install`.
- Model językowy tylko przez port `LLMProvider` ([ADR 0010](docs/adr/0010-port-llm.md)): serwisy nie importują SDK dostawcy ani nie znają formatu jego API.
- Nowy publiczny endpoint zapisu: limit w `frontend/nginx.conf` w tym samym PR.
- Backend: endpoint -> service -> repository -> model.
- Stan prac: `docs/status.md`. Zadania: `docs/tasks/`. Decyzje: `docs/adr/` (nowy plik z `0000-template.md`, kolejny numer).

## Pull requesty

- Tytuł i opis PR po polsku.
- Branch od numeru zadania: `0012-middleman`. Tytuł PR też: `[0012] Middleman innowacji`. Kilka zadań: `[0003, 0005] ...`. PR bez zadania (np. drobne porządki): bez prefiksu.
- Po otwarciu PR: numer do pola `PR` zadania, `Status: review`.
- Przed każdym PR aktualizacja stanu: status i checkboxy w `docs/tasks/`, listy w `docs/status.md`. Aktualizacja w tym samym PR.