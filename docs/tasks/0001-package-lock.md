# 0001. package-lock.json i npm ci

- Status: zrobione
- Osoba: Daniel, Kacper (frontend)
- PR: #6, #25

## Cel

Powtarzalne buildy frontu.

## Kroki

- [x] `npm install` lokalnie, zacommitować `frontend/package-lock.json`
- [x] W `frontend/Dockerfile` zamienić `npm install` na `npm ci`
