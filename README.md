# hackyeah_2026

Monorepo: `backend/` (FastAPI + PostgreSQL) i `frontend/` (React + Vite + TypeScript).

Sędzia (kilka minut): [SEDZIA.md](SEDZIA.md). Jury: [docs/jury/README.md](docs/jury/README.md). Stan prac: [docs/status.md](docs/status.md). Decyzje: [docs/adr/](docs/adr/).

## Struktura

```
.
├── docker-compose.yml        # db + backend + frontend
├── .env.example              # wspólna konfiguracja
├── assets/                   # dane ROPS (innowacje, raporty, Obserwator)
├── scrapers/                 # scrapery danych ROPS
├── docs/                     # status, zadania, ADR, materiały dla jury
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/              # migracje
│   ├── scripts/              # seedy, scraper innowacji, ewaluacja
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
        ├── admin/            # panel administratora
        ├── kreator/          # Kreator pomysłów
        ├── hooks/, lib/, context/, types/, styles/
```

Przepływ: `endpoint -> service -> repository -> model`. Endpoint nie dotyka ORM bezpośrednio.

## Model językowy

Serwisy używają portu `LLMProvider` (`services/llm.py`), nie SDK dostawcy ([ADR 0010](docs/adr/0010-port-llm.md)). Ustawienia w `.env`: `LLM_PROVIDER` (`deepseek` domyślnie, `openai`), `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`. Bez klucza czat odpowiada 503, a panel i Kreator działają bez AI. Dopasowanie zgłoszeń do kart w panelu jest deterministyczne (`services/matching.py`).

## Limity zapytań

Limity są w `frontend/nginx.conf`: czat i karta usługi (10/min na IP), publiczne zapisy (20/min), `/api/v1/admin/` (120/min). `CHAT_ENABLED=false` wyłącza czat. Nowy publiczny endpoint zapisu dodaj do sekcji `location` w nginx.

## Start (Docker)

```bash
cp .env.example .env          # ustaw POSTGRES_PASSWORD, LLM_API_KEY, ADMIN_TOKEN
docker compose up --build
```

- Frontend: http://localhost:8080 (statyczny build na nginx, `/api` proxowane do backendu)
- API docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432

Migracje uruchamiają się przy starcie backendu. Przy `DEMO_DATA=true` (domyślnie w `.env.example`) do pustej bazy wczytują się też przykładowe dane demo z `backend/scripts/demo-data.json`: zgłoszenia, powiadomienia, mentorzy, giełda partnerstw, importy dokumentów, notatki radaru, nabory i oceny, więc po `git clone` panel jest od razu wypełniony (token panelu: `ADMIN_TOKEN` z `.env`). Daty są przesuwane do „teraz”. Świeża baza: `docker compose down -v`. Odświeżenie fixture po zmianie danych: `docker compose exec backend python scripts/demo_data.py export`.

 Backend: kod jako volume, hot reload. Frontend: statyczny build, po zmianach `docker compose up --build frontend`.

Frontend z HMR (backend w Dockerze):

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
cd frontend && npm run lint && npm test && npm run build
```
