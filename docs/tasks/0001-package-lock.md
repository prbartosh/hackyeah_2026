# 0001. package-lock.json i npm ci

- Status: zrobione
- Osoba: Daniel, Kacper (frontend)
- PR: #6, #25

## Jak działa

- `frontend/package-lock.json` jest w repo.
- `frontend/Dockerfile` instaluje zależności przez `npm ci`, więc build jest powtarzalny.
