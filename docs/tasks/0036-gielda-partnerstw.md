# 0036. Giełda partnerstw (moduł V)

- Status: review
- Osoba: Nikodem
- PR: #58

## Cel

Publiczna tablica ogłoszeń partnerskich (szukam partnera / oferuję wsparcie) moderowana przez ROPS, z kontaktem przez ROPS bez ujawniania e-maili. Wzmacnia moduł V (platforma komunikacji) o partnerstwa międzysektorowe.

## Kroki

- [x] Model, migracja 0008, schematy, repozytorium, serwis
- [x] API publiczne `/api/v1/partnerstwa` i panel `/api/v1/admin/partnerstwa`
- [x] Limity nginx, testy pytest
- [x] Strona `/partnerstwa`, trasa, link w nawigacji, link z innowacji, zakładka w panelu
- [x] Seed demo (4 przykładowe ogłoszenia)
- [x] ADR 0013

## Notatki

Migracja ma numer 0008; jeśli inne zadanie doda własną, trzeba przenumerować. Wysyłka e-mail to na razie log (ADR 0013).
