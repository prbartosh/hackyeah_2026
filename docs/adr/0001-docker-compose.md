# 0001. Całość w Docker Compose

- Data: 2026-10-03
- Status: przyjęta

## Kontekst

Zespół potrzebuje identycznego środowiska bez ręcznej instalacji Postgresa i zależności.

## Decyzja

Serwisy `db`, `backend`, `frontend` w jednym `docker-compose.yml`. Migracje Alembic odpalane przy starcie backendu.

## Konsekwencje

Start jedną komendą. Wymaga działającego Dockera.
