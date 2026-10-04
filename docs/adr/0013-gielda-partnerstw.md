# 0013. Giełda partnerstw: moderacja i pośrednictwo ROPS

- Data: 2026-10-04
- Status: przyjęta

## Kontekst

Brief wymaga partnerstw międzysektorowych (publiczny, NGO, biznes, nauka, mieszkańcy). Platforma ma wątek zgłoszenia, ale nie ma miejsca, gdzie instytucje mogą szukać partnera albo oferować wsparcie. Ogłoszenia są publiczne i bez konta, więc ryzyko to spam oraz wyciek adresów e-mail.

## Decyzja

- Publiczna tablica ogłoszeń (`ogloszenia_partnerskie`): typ `szukam_partnera` albo `oferuje_wsparcie`, sektor, powiat Małopolski, opcjonalna innowacja.
- Moderacja przed publikacją: nowe ogłoszenie ma status `oczekuje`, widoczne jest dopiero po `opublikowane` w panelu ROPS. Panel używa istniejącej autoryzacji (`require_admin`).
- E-mail kontaktowy autora nigdy nie jest zwracany publicznym API. Zainteresowany pisze przez formularz „Napisz przez ROPS”, który otwiera rozmowę (zadanie 0042, `rozmowy_partnerskie` i `wiadomosci_rozmow`; wcześniejsze jednorazowe wiadomości zostają w `wiadomosci_partnerskie`). Rozmowa trafia do powiadomień panelu, a każda strona dostaje własny losowy token i link `/rozmowa/{token}`: autor w e-mailu z treścią pierwszej wiadomości, nadawca w odpowiedzi API i e-mailu. Przez link strona czyta rozmowę i odpisuje (`GET /api/v1/partnerstwa/rozmowy/{token}`, `POST .../wiadomosci`); każda nowa wiadomość idzie e-mailem do drugiej strony z jej linkiem. Widok rozmowy nie zawiera adresów e-mail żadnej ze stron, a nadawca zna autora tylko jako nazwę instytucji z ogłoszenia. Posiadanie tokenu jest jedynym dostępem (jak w wątku zgłoszenia), więc link należy zachować. Pracownik ROPS w panelu widzi listę rozmów, może dopisać wpis (obie strony dostają e-mail) i zamknąć rozmowę przy nadużyciu; zamknięta rozmowa jest tylko do odczytu.
- Na demo adapter e-mail tylko loguje wiadomość (`EMAIL_BACKEND=log`), więc prawdziwa wysyłka wymaga podpięcia SMTP.
- Limity nginx jak dla pozostałych publicznych formularzy; limity długości pól w Pydantic.

## Konsekwencje

- Kontakty są chronione, ROPS ma kontrolę nad treścią i widzi cały ruch partnerski.
- Pracownik ROPS moderuje ogłoszenia i nadużycia, ale nie przekazuje już każdej odpowiedzi ręcznie. Wyciek linku z tokenem daje dostęp do rozmowy; limity nginx obejmują nowy publiczny POST.
- Wiadomości są zapisane także wtedy, gdy wysyłka e-mail zawiedzie.
