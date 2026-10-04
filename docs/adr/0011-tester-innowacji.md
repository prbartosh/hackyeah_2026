# 0011. Tester innowacji (moduł IV)

- Data: 2026-10-03
- Status: przyjęta

## Kontekst

Moduł IV wyzwania: zgłoszenie do testów, ocena rozwiązań i propozycje usprawnień. Oceny mają podnosić poziom dowodu innowacji (pomysł → pilot → sprawdzone). Panel ([ADR 0006](0006-panel-administratora.md)) ma skrzynkę, wątki i powiadomienia.

## Decyzja

- **Jedna tabela `opinie`** (migracja `0005`): `slug` innowacji, `rodzaj` (`test` albo `ocena`), `ocena` 1–5 (tylko przy ocenie), `instytucja` (typ instytucji, bez nazwisk), `tresc`, `usprawnienie`, `status`, `token_watku`, `syntetyczna`. Bez kont, jak w Kreatorze ([ADR 0008](0008-kreator-pomyslow.md)).
- **Człowiek zatwierdza.** Nowa opinia (`nowa`) nie jest publiczna; ROPS publikuje ją albo ukrywa w `/admin/opinie`. Liczby i poziom dowodu tylko z opublikowanych.
- **Zgłoszenie do testów to też zwykłe zgłoszenie (`Ticket`)** z prefiksem „[Zgłoszenie do testów]”: admin dostaje powiadomienie, triaż i wątek, a autor link do odpowiedzi. Ocena tworzy tylko powiadomienie „Nowa ocena do zatwierdzenia”, żeby nie zapychać skrzynki.
- **Poziom dowodu z testów** jest liczony w locie, osobno od pola `poziom_dowodu` karty (to opisuje ROPS): `opisane` (brak opublikowanych opinii), `pilotaz` / „W testach” (co najmniej jedno opublikowane zgłoszenie do testów albo ocena), `sprawdzone` (co najmniej 3 opublikowane oceny, średnia od 4). Progi są stałymi w `services/opinions.py`.
- **Endpointy:** publiczne `GET` i `POST /api/v1/innovations/{slug}/opinie`, admin `GET /api/v1/admin/opinie?status=` i `PATCH /api/v1/admin/opinie/{id}`. Bez AI, więc bez kosztu modelu.
- **Front:** sekcja „Oceny i testy” na `/innowacja/:slug` (opinie syntetyczne z etykietą „Dane demo”) i strona w panelu.

## Konsekwencje

- Prosty model, ten sam przepływ co reszta panelu.
- Bez kont każdy może wysłać ocenę, więc moderacja jest obowiązkowa. Publiczny `POST` ma limit w nginx.
- Poziom dowodu z testów nie zmienia pola `poziom_dowodu` karty. Jeśli ROPS będzie chciał, admin może je podnieść ręcznie w edycji karty.
- Brak cyklu życia testu (zgłoszony → w trakcie → zakończony). Na demo wystarczy wątek w skrzynce.
