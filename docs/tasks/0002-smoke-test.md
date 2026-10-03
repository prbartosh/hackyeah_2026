# 0002. Pierwsze uruchomienie stacku

- Status: todo
- Osoba: Bartosz (integracja)

## Cel

Cały stack wstaje w Dockerze i działa end-to-end.

## Kroki

- [ ] `docker compose up --build`
- [ ] `curl localhost:8000/api/v1/health` zwraca `ok`
- [ ] http://localhost:8080 ładuje stronę główną, a czat przez proxy `/api` odpowiada strumieniem (wymaga `OPENAI_API_KEY` w `.env`)
- [ ] `/innowacja/<slug>` pokazuje kartę innowacji z `GET /api/v1/innovations/{slug}`
- [ ] `docker compose exec backend pytest` przechodzi
