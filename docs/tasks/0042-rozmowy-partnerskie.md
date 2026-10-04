# 0042. Rozmowa partnerska przez ROPS (moduł V)

- Status: review
- Osoba: Nikodem
- PR: #64

## Cel

Kontakt w Giełdzie partnerstw staje się dwustronną rozmową przez ROPS, bez ujawniania adresów e-mail. Dotąd autor ogłoszenia dostawał jednorazowy e-mail i nie miał jak odpowiedzieć.

## Kroki

- [x] Modele `PartnershipConversation` i `PartnershipConversationMessage`, migracja 0011
- [x] API: kontakt tworzy rozmowę, `GET/POST /api/v1/partnerstwa/rozmowy/{token}`, e-mail z linkiem do drugiej strony
- [x] Panel: lista rozmów, podgląd, zamknięcie, wpis ROPS
- [x] Limit nginx dla nowego publicznego POST
- [x] Strona `/rozmowa/:token`, link po kontakcie, `localStorage` `splot-rozmowy`
- [x] ADR 0013 zaktualizowany, testy pytest i vitest
- [ ] Zmergować 0040 i 0041 (migracje 0009, 0010) przed tym PR-em

## Notatki

Migracja ma numer 0011 z `down_revision="0010"`: wymaga wcześniejszego zmergowania 0040 i 0041. Stara tabela `wiadomosci_partnerskie` zostaje bez zmian (historyczne wiadomości), nowe trafiają do `wiadomosci_rozmow`. Wysyłka e-mail to nadal log (ADR 0013).
