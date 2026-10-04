# 0040. Mentorzy (moduł V)

- Status: w toku
- Osoba: Nikodem
- PR: 

## Cel

Mentorzy w platformie komunikacji: publiczna lista mentorów, prośba autora zgłoszenia o mentora, przydział przez ROPS i odpowiedź mentora linkiem, bez konta.

## Kroki

- [x] Model `Mentor`, pola `mentor_id` i `mentor_prosba` na zgłoszeniu, migracja 0009
- [x] API publiczne: `GET /mentorzy`, `POST /zgloszenia/watek/{token}/mentor`
- [x] Panel: CRUD mentorów, `PATCH /admin/zgloszenia/{id}/mentor` (e-mail do mentora, wiadomość systemowa w wątku)
- [x] Odpowiedź mentora: `GET/POST /mentor/{token_mentora}/watek/{token_watku}`, tylko w przypisanym wątku
- [x] Limit nginx dla nowych publicznych POST
- [x] Front: `/mentorzy`, `/mentor/:mentorToken/:threadToken`, „Poproś mentora” na `ThreadPage`, zakładka „Mentorzy” i wybór mentora w zgłoszeniu
- [x] Seed demo (5 przykładowych mentorów), testy pytest, ADR 0014

## Notatki

Wiadomości w wątku mają role `mentor` i `system` (szerszy `ThreadMessageRead`). E-mail do mentora na demo tylko loguje (`EMAIL_BACKEND=log`). Link do `/mentorzy` w nagłówku doda 0043.
