# 0037. Porównaj innowacje

- Status: review
- Osoba: Nikodem
- PR: #56

## Cel

Dyrektorka OPS albo szkoły wybiera jedno rozwiązanie spośród 2–3 dopasowań z czatu lub Zasobnika, więc dostaje porównanie obok siebie zamiast skakania między kartami. Tylko frontend, na istniejącym `GET /api/v1/innovations/{slug}`.

## Kroki

- [x] Logika stanu porównania (`lib/compare.ts`, maks. 3, parsowanie adresu) z testami
- [x] Hook `useCompare` (sessionStorage w try/catch)
- [x] Przełącznik „Dodaj do porównania” (`aria-pressed`) na karcie Zasobnika, w wynikach czatu i na stronie innowacji
- [x] Pływający pasek „Porównaj (n)” od 2 pozycji, `aria-live="polite"`, nad polem czatu
- [x] Strona `/porownaj?slug=a&slug=b`: tabela (desktop), sekcje (mobile < 48rem), „Drukuj”
- [x] Trasa leniwa w `App.tsx`
- [ ] Kontrola axe i przejście klawiaturą na działającej aplikacji

## Notatki

- Stan wyboru jest w `sessionStorage`, ale strona porównania czyta wyłącznie adres, więc link można skopiować.
- Pasek ustawia `--compare-bar-h`, a przyklejone pole czatu unosi się nad nim.
