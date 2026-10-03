# 0010. Pasek dostępności na mobile i wejście głosowe

- Status: todo
- Osoba: Daniel (frontend)
- PR:

## Cel

Na telefonie treść jest widoczna od razu, a wejście głosowe (w zakresie demo) działa albo uczciwie mówi, że przeglądarka go nie obsługuje.

## Kroki

- [ ] Przy szerokości 390 px pasek dostępności zajmuje ok. 240 z 900 px wysokości. Na wąskim ekranie zwinąć go do jednego przycisku „Ustawienia dostępności”, który rozwija rozmiar tekstu i motyw. Na desktopie bez zmian
- [ ] Przycisk i panel obsługiwane klawiaturą, `aria-expanded`, fokus wraca na przycisk po zamknięciu
- [ ] Wejście głosowe (`VoiceButton`): test w Chrome (desktop i Android), Safari (macOS i iOS) i Firefox. Komunikat dla przeglądarek bez obsługi już jest. Rozważyć ukrycie przycisku tam, gdzie API nie istnieje, zamiast komunikatu po kliknięciu
- [ ] Audyt axe na mobile w 3 motywach

## Notatki

- 2026-10-03: axe na desktopie, strona główna i strona innowacji, 3 motywy: 0 naruszeń.
