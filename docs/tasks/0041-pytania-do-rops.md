# 0041. Pytania do ROPS i publiczne FAQ (moduł V)

- Status: review
- Osoba: Nikodem
- PR: #63

## Cel

Użytkownik zadaje pytanie ROPS bez konta. Po odpowiedzi pracownika pytanie może zostać opublikowane w publicznym FAQ, ale tylko za zgodą pytającego. Wzmacnia moduł V (dialog ROPS z użytkownikami).

## Kroki

- [x] Model `Pytanie`, migracja 0010, schematy, repozytorium, serwis
- [x] API publiczne `/api/v1/pytania` (wyszukiwanie bez wielkości liter i polskich znaków) i panel `/api/v1/admin/pytania`
- [x] Powiadomienie w panelu i e-mail do `ADMIN_NOTIFY_EMAIL`, e-mail z odpowiedzią do pytającego
- [x] Limit nginx, testy pytest
- [x] Strona `/pytania`, zakładka „Pytania” w panelu
- [x] Seed demo (7 przykładowych pytań)
- [x] ADR 0015
- [ ] Przegląd zespołu

## Notatki

Migracja `0010` ma `down_revision = "0009"` (mentorzy, zadanie 0040): PR 0040 musi zostać zmergowany przed tym PR. Bez linku w nagłówku (zrobi to 0043). Szkic odpowiedzi AI pominięty (uzasadnienie w ADR 0015).
