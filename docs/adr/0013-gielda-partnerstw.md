# 0013. Giełda partnerstw: moderacja i pośrednictwo ROPS

- Data: 2026-10-04
- Status: przyjęta

## Kontekst

Brief wymaga partnerstw międzysektorowych (publiczny, NGO, biznes, nauka, mieszkańcy). Platforma ma wątek zgłoszenia, ale nie ma miejsca, gdzie instytucje mogą szukać partnera albo oferować wsparcie. Ogłoszenia są publiczne i bez konta, więc ryzyko to spam oraz wyciek adresów e-mail.

## Decyzja

- Publiczna tablica ogłoszeń (`ogloszenia_partnerskie`): typ `szukam_partnera` albo `oferuje_wsparcie`, sektor, powiat Małopolski, opcjonalna innowacja.
- Moderacja przed publikacją: nowe ogłoszenie ma status `oczekuje`, widoczne jest dopiero po `opublikowane` w panelu ROPS. Panel używa istniejącej autoryzacji (`require_admin`).
- E-mail kontaktowy autora nigdy nie jest zwracany publicznym API. Zainteresowany pisze przez formularz „Napisz przez ROPS”: wiadomość jest zapisywana (`wiadomosci_partnerskie`), trafia do powiadomień panelu i jest przekazywana autorowi przez adapter e-mail z modułu wątków. Autor dostaje treść i nazwę nadawcy, bez adresu nadawcy; dalszą korespondencję ROPS pośredniczy ręcznie.
- Na demo adapter e-mail tylko loguje wiadomość (`EMAIL_BACKEND=log`), więc prawdziwa wysyłka wymaga podpięcia SMTP.
- Limity nginx jak dla pozostałych publicznych formularzy; limity długości pól w Pydantic.

## Konsekwencje

- Kontakty są chronione, ROPS ma kontrolę nad treścią i widzi cały ruch partnerski.
- Pracownik ROPS jest wąskim gardłem: moderacja i przekazywanie odpowiedzi są ręczne.
- Wiadomości są zapisane także wtedy, gdy wysyłka e-mail zawiedzie.
