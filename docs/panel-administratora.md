# Panel administratora (moduł VI)

Decyzje: [ADR 0006](adr/0006-panel-administratora.md).

## Uruchomienie

1. W `.env` ustaw `ADMIN_TOKEN` (dowolny długi sekret) i, jeśli jest klucz, `LLM_API_KEY` (DeepSeek). Bez tokenu panel jest wyłączony (503), bez klucza działa tryb uproszczony (patrz niżej).
2. `docker compose up --build`. Przy starcie migracja `0002` tworzy tabele, a backend jednorazowo importuje 115 kart z `assets/innowacje-spoleczne/` do bazy jako opublikowane.
3. Dane demo (16 syntetycznych zgłoszeń, oznaczonych „Dane demo”): `docker compose exec backend python scripts/seed_demo.py`. Skrypt jest idempotentny. Przy `LLM_API_KEY` triaż idzie przez DeepSeek. Embeddingi są zawsze lokalne.
   Oceny i testy innowacji (moduł IV, [ADR 0011](adr/0011-tester-innowacji.md)): `docker compose exec backend python scripts/seed_tester.py`. Moderacja w `/admin/opinie`, sekcja „Oceny i testy” na karcie np. `/innowacja/kody-qr-na-pomoc-seniorom`.
4. Dokumenty do uploadu: `assets/demo/*.docx` (syntetyczne; odtworzenie: `python backend/scripts/make_demo_documents.py`).
5. Aplikacja: <http://localhost:8080>. Panel: `/admin` (logowanie tokenem). Formularz zgłoszenia: `/zglos` (link w stopce).

## Przejście demo

1. **Zgłoszenie wpływa.** `/zglos` → opisz sprawę, najlepiej z e-mailem → dostajesz link `/watek/...`. W panelu rośnie licznik „Powiadomienia”.
2. **Triaż.** `/admin` → skrzynka (sortowanie po pilności i czasie oczekiwania, wskaźnik „Po terminie”) → otwórz zgłoszenie. Analiza uruchamia się sama: obszar, pilność, duplikaty, pasujące karty, szkic odpowiedzi ze źródłami.
3. **Odpowiedź.** Edytuj szkic → „Zatwierdź odpowiedź” → „Tak, wyślij odpowiedź”. Autor widzi odpowiedź pod swoim linkiem (e-mail jest tylko logowany, adapter `EmailSender`).
4. **Dokument → karta.** „Wgraj dokument” → `dokument-projektu-1-autobus-zdrowia.docx` → przegląd: pola obok cytatów z dokumentu, pola o niskiej pewności i puste są oznaczone tekstem → „Zatwierdź i opublikuj”. Karta od razu jest w `GET /api/v1/innovations/{slug}` i w katalogu czatu.
5. **Edycja kart.** „Karty innowacji”: statusy, edycja, poziom dowodu, podgląd tak, jak widzi użytkownik.
6. **Radar.** „Radar trendów”: grupy zgłoszeń bez dopasowania, trend tygodniowy, „Utwórz notatkę dla ROPS”. Po dodaniu karty z kroku 4 i „Wygeneruj szkic od nowa” przy zgłoszeniu o transporcie zgłoszenie dostaje dopasowanie i wypada z radaru.

## API

Wszystko pod `/api/v1/admin/*` wymaga `Authorization: Bearer <ADMIN_TOKEN>`: `zgloszenia`, `powiadomienia`, `ustawienia`, `karty`, `importy`, `radar`. Publiczne: `POST /zgloszenia`, `GET /zgloszenia/watek/{token}`. Dokumentacja: `/docs`.

## AI, koszty i awarie

- Dzienny limit wywołań AI: `AI_DAILY_CALL_LIMIT` (tabela `uzycie_ai`). Liczy się każde wywołanie modelu (JSON).
- Dopasowanie bez embeddingów ([ADR 0006](adr/0006-panel-administratora.md), `services/matching.py`): tagi ze słownika, pokrycie tagów kart i trigramy, z powodami przy każdej karcie i grupie. Bez klucza, po przekroczeniu limitu i przy awarii: triaż regułowy, import dokumentu z pustymi polami do ręcznego uzupełnienia. UI pokazuje komunikat po polsku.
- Nie ma już przeliczania wektorów ani `POST /api/v1/admin/reindeksuj`: wynik liczy się w locie.
- Szkic odpowiedzi cytuje tylko karty z listy kandydatów, wskazanych przez `matching.py`. Pole z dokumentu bez dosłownego cytatu w tekście jest zerowane.

## Znane ograniczenia

- Jeden wspólny token zamiast kont: brak śladu, kto zatwierdził.
- Limity nginx: publiczne zapisy (`POST /zgloszenia`, Kreator, oceny) 20 na minutę na IP (zapas 10), `/api/v1/admin/` 120 na minutę (zgadywanie tokenu), po przekroczeniu 429.
- E-mail to stub (log). Skany PDF bez tekstu nie są obsługiwane (brak OCR).
- Radar korzysta tylko ze zgłoszeń z panelu. Potrzeby z czatu (tabela `potrzeby`) nie są jego drugim źródłem, służą do bloku „Podobne przypadki” w czacie ([ADR 0012](adr/0012-podobne-przypadki.md)).
- Kategorie kart i zgłoszeń to 9 obszarów ROPS z `kategorie.json`, nie słownik z [ADR 0004](adr/0004-obiekt-innowacji.md) (nakładka kart z dokumentu ma tylko `wdrozenie`).
- Frontend nie ma testów (w `main` nie ma jeszcze vitest, patrz PR Zasobnika).
