# Panel administratora (moduł VI)

Decyzje: [ADR 0006](adr/0006-panel-administratora.md).

## Uruchomienie

1. W `.env` ustaw `ADMIN_TOKEN` (długi sekret) i opcjonalnie `LLM_API_KEY`. Bez tokenu panel jest wyłączony (503), bez klucza działa tryb regułowy.
2. `docker compose up --build`. Przy starcie backend importuje 115 kart z `assets/innowacje-spoleczne/` jako opublikowane.
3. Dane demo ładują się same przy starcie do pustej bazy (`DEMO_DATA=true`, plik `backend/scripts/demo-data.json`, wszystko wymyślone). Ręczne seedy (idempotentne): `docker compose exec backend python scripts/seed_demo.py` (zgłoszenia „Dane demo”, mentorzy, ogłoszenia, pytania). Oceny i testy: `scripts/seed_tester.py` ([ADR 0011](adr/0011-tester-innowacji.md)).
4. Dokumenty do uploadu: `assets/demo/*.docx` (odtworzenie: `python backend/scripts/make_demo_documents.py`).
5. Aplikacja: <http://localhost:8080>. Panel: `/admin` (logowanie tokenem). Formularz zgłoszenia: `/zglos`.

Bez Dockera (SQLite, token `demo-token`, seeduje też Kreatora i Testera): `python backend/scripts/dev_panel.py`.

## Przejście demo

1. **Zgłoszenie.** `/zglos` → opis, najlepiej z e-mailem → link `/watek/...`. W panelu rośnie licznik powiadomień.
2. **Triaż.** `/admin` → skrzynka (sortowanie po pilności i czasie oczekiwania) → zgłoszenie. Analiza uruchamia się sama: obszar, pilność, duplikaty, pasujące karty, szkic odpowiedzi ze źródłami.
3. **Odpowiedź.** Edytuj szkic → „Zatwierdź odpowiedź” → „Tak, wyślij odpowiedź”. Autor widzi ją pod swoim linkiem. E-mail jest tylko logowany.
4. **Dokument → karta.** „Wgraj dokument” → `dokument-projektu-1-autobus-zdrowia.docx` → przegląd: pola obok cytatów, pola o niskiej pewności i puste są oznaczone → „Zatwierdź i opublikuj”. Karta od razu trafia do API i katalogu czatu.
5. **Karty.** „Karty innowacji”: statusy, edycja, poziom dowodu, podgląd.
6. **Radar.** „Radar trendów”: grupy zgłoszeń bez dopasowania, trend tygodniowy, „Utwórz notatkę dla ROPS”. Po dodaniu karty z kroku 4 i „Wygeneruj szkic od nowa” zgłoszenie o transporcie dostaje dopasowanie i znika z radaru.
7. **Pozostałe zakładki:** `/admin/opinie`, `/admin/nabory`, `/admin/partnerstwa`, `/admin/mentorzy`, `/admin/pytania`.

## API

Wszystko pod `/api/v1/admin/*` wymaga `Authorization: Bearer <ADMIN_TOKEN>`. Publiczne: `POST /zgloszenia`, `GET /zgloszenia/watek/{token}`. Dokumentacja: `/docs`.

## AI i awarie

- Dopasowanie (`services/matching.py`): tagi ze słownika, pokrycie tagów kart, trigramy, z powodami przy każdej karcie i grupie.
- Bez klucza i przy awarii: triaż regułowy, import dokumentu z pustymi polami. UI pokazuje komunikat po polsku.
- Szkic odpowiedzi cytuje tylko karty kandydatów z `matching.py`. Pole z dokumentu bez dosłownego cytatu jest zerowane.

## Znane ograniczenia

- Jeden wspólny token zamiast kont: brak śladu, kto zatwierdził.
- Limity nginx: publiczne zapisy 20/min na IP (zapas 10), `/api/v1/admin/` 120/min, po przekroczeniu 429.
- E-mail to stub (log). Skany PDF bez tekstu nie są obsługiwane (brak OCR).
- Radar korzysta tylko ze zgłoszeń z panelu. Potrzeby z czatu (tabela `potrzeby`) służą do bloku „Podobne przypadki” ([ADR 0012](adr/0012-podobne-przypadki.md)).
- Kategorie kart i zgłoszeń to 9 obszarów ROPS z `kategorie.json`, nie słownik z [ADR 0004](adr/0004-obiekt-innowacji.md) (nakładka kart z dokumentu ma tylko `wdrozenie`).
