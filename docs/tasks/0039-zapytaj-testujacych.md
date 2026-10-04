# 0039. Zapytaj instytucję, która to testuje (moduł V)

- Status: review
- Osoba: Wiktor
- PR: #66

## Cel

Punkt 6 z [pomysly-na-przewage.md](../pomysly-na-przewage.md). Na stronie innowacji można zadać pytanie instytucjom, które ją testują. Pytanie idzie przez ROPS jako pośrednika: nikt nie widzi cudzych danych kontaktowych. Przy okazji autor może odpisać w swoim wątku, więc komunikacja przestaje działać w jedną stronę.

## Kroki

- [x] Migracja 0009: `zgloszenia.innowacja_slug`
- [x] `POST /api/v1/zgloszenia/watek/{token}/wiadomosci`: autor odpisuje w wątku, odpowiedziane zgłoszenie wraca do „w trakcie”, powiadomienie w panelu
- [x] `POST /api/v1/innovations/{slug}/opinie/pytanie`: pytanie trafia do skrzynki jako zgłoszenie powiązane z innowacją (tylko gdy jest zatwierdzone zgłoszenie do testów z wątkiem)
- [x] Panel: lista instytucji testujących przy pytaniu, `POST /api/v1/admin/zgloszenia/{id}/przekaz` wysyła zatwierdzony tekst do wątku instytucji (i e-mail, jeśli go podała)
- [x] Frontend: formularz „Zapytaj instytucję, która to testuje”, odpowiedź w `/watek/:token`, panel „Instytucje, które to testują”
- [x] Limity nginx dla obu nowych publicznych zapisów
- [x] Seed Testera: zgłoszenia do testów demo dostają wątek (też na istniejącej bazie)
- [x] Testy pytest

## Notatki

- Odpowiedź instytucji ROPS przekazuje pytającemu zwykłą odpowiedzią w jego zgłoszeniu. Celowo bez automatu: każdy tekst zatwierdza człowiek.
- Migracja wchodzi sama przy starcie backendu. Na istniejącej bazie trzeba raz uruchomić `docker compose exec backend python scripts/seed_tester.py`, żeby testy demo dostały wątki.
