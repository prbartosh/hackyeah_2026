# 0010. Pasek dostępności na mobile i wejście głosowe

- Status: zrobione
- Osoba: Daniel (frontend)
- PR: #20, #25

## Jak działa

- Na wąskim ekranie pasek dostępności jest zwinięty do przycisku „Ustawienia dostępności”, który rozwija rozmiar tekstu i motyw. Na desktopie pasek jest stale widoczny.
- Przycisk ma `aria-expanded`, panel obsługuje klawiaturę, Escape i zamknięcie oddają fokus przyciskowi.
- Przycisk dyktowania jest ukryty, gdy przeglądarka nie ma Web Speech API.
- axe: 0 naruszeń na desktopie i mobile (390 px), w 3 motywach, bez poziomego przewijania.
