# 0040. Dyżur eksperta (moduł V)

- Status: w toku
- Osoba: Wiktor
- PR: 

## Cel

Punkt 7 z [pomysly-na-przewage.md](../pomysly-na-przewage.md). W wątku zgłoszenia autor prosi o eksperta. ROPS przypisuje eksperta z listy, a jego odpowiedzi w tym samym wątku są podpisane rolą eksperta. Moduł V przestaje być „tylko skrzynką”.

## Kroki

- [x] Migracja 0010: `zgloszenia.prosba_o_eksperta`, `zgloszenia.ekspert`, `wiadomosci_watku.podpis`
- [x] `POST /api/v1/zgloszenia/watek/{token}/ekspert`: prośba (raz), powiadomienie w panelu, odpowiedziane zgłoszenie wraca do „w trakcie”
- [x] `GET /api/v1/admin/eksperci`, `PUT /api/v1/admin/zgloszenia/{id}/ekspert` (tylko role z listy)
- [x] Odpowiedź zatwierdzona przy przypisanym ekspercie dostaje podpis
- [x] Frontend: „Poproś eksperta” w `/watek/:token`, panel „Dyżur eksperta” w zgłoszeniu, znacznik w skrzynce
- [x] Limit nginx dla prośby
- [x] Testy pytest

## Notatki

- Lista ekspertów to role (`EKSPERCI` w `services/tickets.py`), nie osoby: nie wymyślamy nazwisk. Prawdziwą listę uzupełnia ROPS po wdrożeniu.
- Ekspert odpowiada przez panel ROPS (ta sama skrzynka i zatwierdzanie). Osobne konta ekspertów to etap 2, razem z kontami instytucji.
