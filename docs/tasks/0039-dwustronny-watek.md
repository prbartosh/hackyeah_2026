# 0039. Dwustronny wątek zgłoszenia

- Status: review
- Osoba: Nikodem
- PR: #62

## Cel

Autor zgłoszenia może dopisać do rozmowy z ROPS (dziś odpowiada tylko zespół), a wątek wygląda jak rozmowa. Przygotowane wyświetlanie wiadomości mentora (zapisze je 0040) i lista „Moje sprawy” z linkami do wątków zapisanymi w przeglądarce (osadzi ją 0043 na `/wspolpraca`).

## Kroki

- [x] `POST /api/v1/zgloszenia/watek/{token}/wiadomosci` (limit 4000 znaków, 404 przy złym tokenie, `odpowiedziane` → `w_trakcie`)
- [x] Powiadomienie w panelu „Nowa wiadomość w zgłoszeniu #id” i e-mail do `admin_notify_email`
- [x] Testy pytest (`backend/tests/test_ticket_thread.py`)
- [x] Nginx: limit `form_req` dla nowej ścieżki
- [x] `ThreadPage`: dymki z rolą i datą (Ty, ROPS, Mentor), formularz odpowiedzi, „Skopiuj link do wątku”, podpowiedź przy pierwszym wejściu
- [x] `MyThreadsList` + `lib/myThreads.ts` (localStorage w try/catch), „Inne Twoje sprawy” na `ThreadPage`
- [x] Panel: wiadomości autora widać w wątku zgłoszenia, etykieta „Mentor”
- [ ] Oznaczenie „nowa odpowiedź autora” w skrzynce zgłoszeń
- [ ] Sprawdzenie w przeglądarce na działającym stacku (axe, klawiatura)

## Notatki

- Bez migracji: `wiadomosci_watku` ma już `autor_rola` i `tresc`.
- Wiadomość autora do zgłoszenia syntetycznego nie tworzy powiadomienia ani e-maila.
- Rola `mentor` jest tylko wyświetlana; zapis wiadomości mentora należy do 0040.
- Lista „Moje sprawy” jest tylko w `localStorage` tej przeglądarki (brak kont).
