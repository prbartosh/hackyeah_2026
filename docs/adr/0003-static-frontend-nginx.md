# 0003. Frontend statycznie przez nginx

- Data: 2026-10-03
- Status: przyjęta

## Kontekst

Frontend ma być budowany i serwowany statycznie, nie przez dev server.

## Decyzja

Multi-stage Dockerfile: build Vite w Node, serwowanie `dist/` przez nginx. nginx proxuje `/api` do backendu.

## Konsekwencje

Jeden origin, brak CORS. Zmiana we froncie wymaga przebudowy obrazu (HMR tylko przez lokalne `npm run dev`).
