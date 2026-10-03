# 0010. Pasek dostępności na mobile i wejście głosowe

- Status: todo
- Osoba: Daniel (frontend)

## Cel

Na telefonie treść jest widoczna od razu, a wejście głosowe (w zakresie demo) działa albo uczciwie mówi, że przeglądarka go nie obsługuje.

## Kroki

- [x] Przy szerokości 390 px pasek dostępności zajmuje ok. 240 z 900 px wysokości. Na wąskim ekranie zwinąć go do jednego przycisku „Ustawienia dostępności”, który rozwija rozmiar tekstu i motyw. Na desktopie bez zmian
- [x] Przycisk i panel obsługiwane klawiaturą, `aria-expanded`, fokus wraca na przycisk po zamknięciu
- [ ] Wejście głosowe (`VoiceButton`): test w Chrome (desktop i Android), Safari (macOS i iOS) i Firefox. Komunikat dla przeglądarek bez obsługi już jest. Rozważyć ukrycie przycisku tam, gdzie API nie istnieje, zamiast komunikatu po kliknięciu. Przycisk jest już ukrywany, gdy brak API (test w przeglądarkach nadal do zrobienia)
- [x] Audyt axe na mobile w 3 motywach

## Notatki

- 2026-10-03: axe na desktopie, strona główna i strona innowacji, 3 motywy: 0 naruszeń.
- 2026-10-03: axe na mobile (ramka 390 px, rozmowa z wynikami, panel ustawień zamknięty i otwarty), 3 motywy: 0 naruszeń; bez poziomego przewijania.
