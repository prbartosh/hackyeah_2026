# 0011. Tester innowacji (moduł IV)

- Data: 2026-10-03
- Status: proponowana

## Kontekst

Moduł IV wyzwania (+5%): zgłoszenie do testów, ocena rozwiązań, feedback i propozycje usprawnień. Brief: oceny mają podnosić poziom dowodu innowacji (pomysł → pilot → sprawdzone). Panel administratora ([ADR 0006](0006-panel-administratora.md)) ma już skrzynkę, wątki i powiadomienia. Zadanie [0019](../tasks/0019-tester-innowacji.md).

## Decyzja

- **Jedna tabela `opinie`** (migracja `0005`): `slug` innowacji, `rodzaj` (`test` albo `ocena`), `ocena` 1–5 (tylko przy ocenie), `instytucja` (typ instytucji, bez nazwisk), `tresc`, `usprawnienie`, `status`, `token_watku`, `syntetyczna`. Bez kont, jak w Kreatorze ([ADR 0008](0008-kreator-pomyslow.md)).
- **Człowiek zatwierdza.** Nowa opinia ma status `nowa` i nie jest publiczna. Pracownik ROPS publikuje ją albo ukrywa w `/admin/opinie`. Liczby i poziom dowodu liczymy tylko z opublikowanych.
- **Zgłoszenie do testów to też zwykłe zgłoszenie (`Ticket`)** z prefiksem „[Zgłoszenie do testów]”: admin dostaje powiadomienie, triaż i wątek, a autor link do odpowiedzi. Ocena tworzy tylko powiadomienie „Nowa ocena do zatwierdzenia”, żeby nie zapychać skrzynki.
- **Poziom dowodu z testów** jest liczony w locie, osobno od pola `poziom_dowodu` karty (to opisuje ROPS): `opisane` (brak opublikowanych opinii), `pilotaz` / „W testach” (co najmniej jedno opublikowane zgłoszenie do testów albo ocena), `sprawdzone` (co najmniej 3 opublikowane oceny, średnia od 4). Progi są stałymi w `services/opinions.py`.
- **Endpointy:** publiczne `GET` i `POST /api/v1/innovations/{slug}/opinie`, admin `GET /api/v1/admin/opinie?status=` i `PATCH /api/v1/admin/opinie/{id}`. Bez AI, więc bez kosztu modelu.
- **Front:** sekcja „Oceny i testy” na `/innowacja/:slug` (kroki poziomu dowodu, średnia, opinie z etykietą „Dane demo” przy syntetycznych, formularze „Chcę przetestować” i „Oceń rozwiązanie”), strona „Oceny i testy” w panelu.

## Konsekwencje

- Prosty model, ten sam przepływ zgłoszeń co reszta panelu, zero kosztu AI.
- Bez kont każdy może wysłać ocenę, więc moderacja jest obowiązkowa. Publiczny `POST` potrzebuje limitu w nginx, jak pozostałe formularze.
- Poziom dowodu z testów nie zmienia pola `poziom_dowodu` karty. Jeśli ROPS będzie chciał, admin może je podnieść ręcznie w edycji karty.
- Brak cyklu życia testu (zgłoszony → w trakcie → zakończony). Na demo wystarczy wątek w skrzynce.
