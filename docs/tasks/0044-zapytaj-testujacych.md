# 0044. Zapytaj instytucję, która to testuje (moduł V)

- Status: review
- Osoba: Wiktor
- PR: #69

## Cel

Punkt 6 z [pomysly-na-przewage.md](../pomysly-na-przewage.md). Na stronie innowacji można zadać pytanie instytucjom, które ją testują. Pytanie idzie przez ROPS jako pośrednika: nikt nie widzi cudzych danych kontaktowych. Instytucja odpowiada w swoim wątku (dwustronny wątek z [0039](0039-dwustronny-watek.md)).

## Kroki

- [x] Migracja 0012: `zgloszenia.innowacja_slug`
- [x] `POST /api/v1/innovations/{slug}/opinie/pytanie`: pytanie trafia do skrzynki jako zgłoszenie powiązane z innowacją (tylko gdy jest zatwierdzone zgłoszenie do testów z wątkiem); `mozna_zapytac` w podsumowaniu opinii
- [x] Panel: lista instytucji testujących przy pytaniu, `POST /api/v1/admin/zgloszenia/{id}/przekaz` wysyła zatwierdzony tekst do wątku instytucji (i e-mail, jeśli go podała)
- [x] Frontend: formularz „Zapytaj instytucję, która to testuje” w sekcji Testera, panel „Instytucje, które to testują” w zgłoszeniu
- [x] Limit nginx dla nowego publicznego zapisu
- [x] Seed Testera: zgłoszenia do testów demo dostają wątek (też na istniejącej bazie)
- [x] Testy pytest

## Notatki

- Odpowiedź instytucji ROPS przekazuje pytającemu zwykłą odpowiedzią w jego zgłoszeniu. Celowo bez automatu: każdy tekst zatwierdza człowiek.
- Migracja wchodzi sama przy starcie backendu. Na istniejącej bazie trzeba raz uruchomić `docker compose exec backend python scripts/seed_tester.py`, żeby testy demo dostały wątki.
- Zastępuje zamknięty PR #66 (ten sam pomysł, przebudowany na dwustronnym wątku z main).
