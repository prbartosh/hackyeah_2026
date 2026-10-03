# 0002. Warstwy backendu

- Data: 2026-10-03
- Status: przyjęta

## Kontekst

Potrzebny czytelny podział kodu FastAPI, łatwy do testowania.

## Decyzja

Przepływ: endpoint -> service -> repository -> model. Schematy Pydantic osobno od modeli ORM.

## Konsekwencje

Logika biznesowa niezależna od HTTP i SQL. Nieco więcej plików na zasób.
