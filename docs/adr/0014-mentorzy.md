# 0014. Mentorzy: bez konta, dostęp linkiem, przydział przez ROPS

- Data: 2026-10-04
- Status: przyjęta

## Kontekst

Brief wymaga dialogu ROPS z użytkownikami, w tym mentorów. Platforma nie ma kont (zgłoszenia i ogłoszenia działają na tokenach), a mentorzy to zewnętrzne osoby, które nie powinny dostawać dostępu do całego panelu.

## Decyzja

- Mentor (`mentorzy`) jest wpisem prowadzonym przez ROPS w panelu: nazwa, instytucja, sektor, obszary (slugi kategorii), powiat, opis, e-mail, `aktywny`, `syntetyczny`. Publiczne `GET /api/v1/mentorzy` zwraca tylko aktywnych i nigdy e-maila ani tokenu.
- Autor zgłoszenia prosi o mentora ze swojego linku do wątku (`mentor_prosba=true`, powiadomienie w panelu). Nie wybiera mentora sam: dobiera go pracownik ROPS (`PATCH /admin/zgloszenia/{id}/mentor`, panel pod `require_admin`), więc ROPS kontroluje, kto widzi sprawę.
- Przydział wysyła mentorowi e-mail z linkiem `/{public_base_url}/mentor/{token_mentora}/{token_watku}` i dodaje do wątku wiadomość systemową „Do sprawy dołączył mentor: X”.
- Mentor nie ma konta: `token_mentora` (losowy, `secrets.token_urlsafe`) w linku jest jego poświadczeniem. `GET/POST /api/v1/mentor/{token_mentora}/watek/{token_watku}` działa tylko wtedy, gdy mentor jest aktywny i przypisany do tego zgłoszenia; w przeciwnym razie 404 (bez ujawniania, czy wątek istnieje). Odpowiedź to `ThreadMessage` z `autor_rola="mentor"`. Mentor nie widzi e-maila ani nazwiska autora.
- Zdjęcie mentora ze zgłoszenia albo wyłączenie go odbiera dostęp.
- Limity nginx i długości pól jak dla pozostałych publicznych formularzy.

## Konsekwencje

- Nie ma logowania ani haseł do utrzymania; wyciek linku daje dostęp do jednej sprawy, a ROPS odbiera go jednym kliknięciem.
- Pracownik ROPS jest wąskim gardłem przy przydziale.
- Token mentora jest jeden na mentora (nie na sprawę); link do konkretnej sprawy wymaga też tokenu wątku, a przydział jest sprawdzany po stronie serwera.
- Na demo e-mail tylko loguje (ADR 0013); prawdziwa wysyłka wymaga SMTP.
