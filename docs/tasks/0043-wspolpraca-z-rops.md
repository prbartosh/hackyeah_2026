# 0043. Współpraca z ROPS (hub modułu V)

- Status: w toku
- Osoba: Nikodem
- PR: 

## Cel

Jedna strona `/wspolpraca`, z której użytkownik trafia do pytań, zgłoszenia potrzeby, mentorów, giełdy partnerstw i swoich spraw, bez zakładania konta. Spina wyniki zadań 0039–0042. Tylko frontend.

## Kroki

- [x] Strona `/wspolpraca`: wstęp, 5 kafli, „Jak to działa”, „Twoje dane”, „Moje sprawy”
- [x] Odczyt rozmów partnerskich z `localStorage` (`splot-rozmowy`) z testami
- [x] Nagłówek: „Współpraca” aktywna także na `/partnerstwa`, `/pytania`, `/mentorzy`, `/watek/*`, `/rozmowa/*`
- [x] Link w stopce, na stronie głównej i na ekranie podziękowania po zgłoszeniu
- [x] Opis modułu V w `docs/jury/mapowanie-na-kryteria.md`
- [ ] Po zmergowaniu 0039: podmienić sprawy z wątków na `MyThreadsList`
- [ ] Kontrola axe i przejście klawiaturą na działającej aplikacji, widok 320 px

## Notatki

- Trasy `/pytania`, `/mentorzy`, `/watek/:token`, `/rozmowa/:token` pochodzą z zadań 0039–0042 i w tym PR jeszcze nie istnieją (do czasu ich mergowania prowadzą na 404).
- `MyThreadsList` (0039) jeszcze nie istnieje. Klucza `localStorage` wątków nie zgadujemy, więc sekcja „Moje sprawy” pokazuje tylko rozmowy partnerskie i tekst „Linki do zgłoszeń znajdziesz w e-mailu”. Po mergowaniu 0039 trzeba dodać `MyThreadsList` w sekcji „Moje sprawy” w `CooperationPage.tsx`.
- Kafel „Moje sprawy” to kotwica `#moje-sprawy`.
