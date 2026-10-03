# 0002. Pierwsze uruchomienie stacku

- Status: todo
- Osoba: 

## Cel

Cały stack wstaje w Dockerze i działa end-to-end.

## Kroki

- [ ] `docker compose up --build`
- [ ] `curl localhost:8000/api/v1/health` zwraca `ok`
- [ ] http://localhost:8080 ładuje listę items przez proxy `/api`
- [ ] `docker compose exec backend pytest` przechodzi
