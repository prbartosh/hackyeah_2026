# 0010. Pasek dostępności na mobile i wejście głosowe

- Status: zrobione
- Osoba: Daniel (frontend)

## Cel

Na telefonie treść jest widoczna od razu.

## Kroki

- [x] Przy szerokości 390 px pasek dostępności zajmuje ok. 240 z 900 px wysokości. Na wąskim ekranie zwinąć go do jednego przycisku „Ustawienia dostępności”, który rozwija rozmiar tekstu i motyw. Na desktopie bez zmian
- [x] Przycisk i panel obsługiwane klawiaturą, `aria-expanded`, fokus wraca na przycisk po zamknięciu
- [x] Audyt axe na mobile w 3 motywach

## Notatki

- 2026-10-03: axe na desktopie, strona główna i strona innowacji, 3 motywy: 0 naruszeń.
- 2026-10-03: axe na mobile (ramka 390 px, rozmowa z wynikami, panel ustawień zamknięty i otwarty), 3 motywy: 0 naruszeń; bez poziomego przewijania.
- 2026-10-03: krok z testem dyktowania w przeglądarkach usunięty z zakresu (decyzja Daniela). Przycisk i tak jest ukrywany, gdy brak Web Speech API. Klawiatura sprawdzona automatem w Edge: aria-expanded, Escape i zamknięcie przyciskiem oddają fokus przyciskowi.
