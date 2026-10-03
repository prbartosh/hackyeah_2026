# hackyeah_2026

Monorepo: `backend/` (FastAPI + PostgreSQL) i `frontend/` (React + Vite + TypeScript).

Jury: zobacz [docs/jury/README.md](docs/jury/README.md). Stan prac: [docs/status.md](docs/status.md), decyzje: [docs/adr/](docs/adr/).

## Struktura

```
.
├── docker-compose.yml        # db + backend + frontend
├── .env.example              # wspólna konfiguracja
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/              # migracje
│   ├── app/
│   │   ├── main.py           # app factory, CORS, routery
│   │   ├── core/             # config (pydantic-settings)
│   │   ├── db/               # engine, sesja, Base
│   │   ├── models/           # modele SQLAlchemy (ORM)
│   │   ├── schemas/          # modele Pydantic (I/O API)
│   │   ├── repositories/     # dostęp do danych (zapytania)
│   │   ├── services/         # logika biznesowa
│   │   └── api/
│   │       ├── deps.py       # zależności (sesja DB)
│   │       └── v1/
│   │           ├── router.py
│   │           └── endpoints/
│   └── tests/
└── frontend/
    ├── Dockerfile            # multi-stage: build (node) -> serve (nginx)
    ├── nginx.conf            # SPA fallback, cache assetów, proxy /api
    └── src/
        ├── api/              # klient HTTP
        ├── components/       # komponenty wielokrotnego użytku
        ├── pages/            # widoki
        ├── hooks/
        ├── types/
        └── styles/
```

Przepływ: `endpoint -> service -> repository -> model`. Endpoint nie dotyka ORM bezpośrednio.

## Model językowy

Serwisy używają portu `LLMProvider` (`services/llm.py`), nie SDK dostawcy ([ADR 0010](docs/adr/0010-port-llm.md)). Dostawcę wybierają `LLM_PROVIDER` (`deepseek` domyślnie, `openai`), `LLM_BASE_URL`, `LLM_MODEL` i `LLM_API_KEY` w `.env`. Bez klucza czat odpowiada 503, a panel i kreator działają bez AI. Dopasowanie zgłoszeń do kart w panelu jest deterministyczne (`services/matching.py`), bez embeddingów.

## Limity zapytań

Płatne endpointy (czat, karta usługi) i publiczne zapisy (zgłoszenia, kreator, oceny, `/items`) mają limity w `frontend/nginx.conf`, a funkcje AI panelu i kreatora dzienny limit wywołań (`AI_DAILY_CALL_LIMIT`, `KREATOR_AI_DAILY_CALL_LIMIT`). Dziennego budżetu tokenów czatu nie ma (usunięty w #45). Nowy publiczny endpoint zapisu dodaj do odpowiedniej sekcji `location` w nginx.

## Start (Docker)

```bash
cp .env.example .env          # ustaw POSTGRES_PASSWORD
docker compose up --build
```

- Frontend: http://localhost:8080 (statyczny build na nginx, `/api` proxowane do backendu)
- API docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432

Migracje odpalają się automatycznie przy starcie backendu. Backend: kod montowany jako volume, hot reload. Frontend: statyczny build, po zmianach `docker compose up --build frontend`.

Szybki dev frontu z HMR (poza Dockerem, backend w Dockerze):

```bash
cd frontend && npm install
VITE_API_URL=http://localhost:8000/api/v1 npm run dev   # http://localhost:5173
```

## Nowa migracja

```bash
docker compose exec backend alembic revision --autogenerate -m "opis"
docker compose exec backend alembic upgrade head
```

## Testy / lint

```bash
docker compose exec backend pytest
docker compose exec backend ruff check .
cd frontend && npm run lint && npm run build
```
