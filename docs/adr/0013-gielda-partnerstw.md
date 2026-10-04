# 0013. Giełda partnerstw: moderacja i pośrednictwo ROPS

- Data: 2026-10-04
- Status: przyjęta

## Kontekst

Brief wymaga partnerstw międzysektorowych. Instytucje potrzebują miejsca, gdzie szukają partnera albo oferują wsparcie. Ogłoszenia są publiczne i bez konta, więc ryzyko to spam i wyciek adresów e-mail.

## Decyzja

- Publiczna tablica ogłoszeń (`ogloszenia_partnerskie`): typ `szukam_partnera` albo `oferuje_wsparcie`, sektor, powiat Małopolski, opcjonalna innowacja.
- Moderacja przed publikacją: nowe ogłoszenie ma status `oczekuje`, widoczne jest dopiero po `opublikowane` w panelu ROPS. Panel pod `require_admin`.
- E-mail kontaktowy autora nigdy nie jest zwracany publicznym API. Zainteresowany pisze przez formularz „Napisz przez ROPS”, który otwiera rozmowę (`rozmowy_partnerskie`, `wiadomosci_rozmow`; starsze jednorazowe wiadomości zostają w `wiadomosci_partnerskie`). Każda strona ma własny losowy token i link `/rozmowa/{token}` (`GET /api/v1/partnerstwa/rozmowy/{token}`, `POST .../wiadomosci`), a nowa wiadomość idzie e-mailem do drugiej strony. Widok rozmowy nie zawiera adresów e-mail, nadawca zna autora tylko jako nazwę instytucji z ogłoszenia. Token jest jedynym dostępem. Pracownik ROPS widzi listę rozmów, może dopisać wpis (obie strony dostają e-mail) i zamknąć rozmowę przy nadużyciu (tylko do odczytu).
- Na demo e-mail tylko loguje (`EMAIL_BACKEND=log`), prawdziwa wysyłka wymaga SMTP.
- Limity nginx jak dla pozostałych formularzy, limity długości pól w Pydantic.

## Konsekwencje

- Kontakty są chronione, ROPS ma kontrolę nad treścią i widzi cały ruch partnerski.
- ROPS moderuje ogłoszenia i nadużycia, ale nie przekazuje każdej odpowiedzi ręcznie. Wyciek linku daje dostęp do jednej rozmowy.
- Wiadomości są zapisane także wtedy, gdy wysyłka e-mail zawiedzie.
