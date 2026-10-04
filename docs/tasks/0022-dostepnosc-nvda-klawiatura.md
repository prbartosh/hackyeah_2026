# 0022. Dostępność: czytnik ekranu i głos we wszystkich modułach

- Status: w toku
- Osoba: Daniel, Kacper
- PR:

## Cel

Każdy moduł przeszedł ręczny test czytnikiem ekranu (NVDA), a wejście głosowe działa w głównych przeglądarkach. Część automatyczna (axe, klawiatura) jest zrobiona.

## Kroki

- [x] axe (WCAG 2.0–2.2 A i AA, best-practice) na 21 trasach w trzech motywach, 1280 px i 375 px: 0 naruszeń (2026-10-04, lokalnie, dane demo)
- [x] Klawiatura: na 12 trasach Tab dochodzi do wszystkich elementów z widocznym fokusem
- [ ] NVDA: Zasobnik wiedzy (`/zasobnik`, strona dokumentu, `/innowacja/:slug`)
- [ ] NVDA: czat i panel „Twój problem”, „Dane gminy”, „Podobne przypadki”
- [ ] NVDA: panel administratora
- [ ] NVDA: kreator pomysłów, fiszka, canvy
- [ ] NVDA: tester innowacji, oceny i zgłoszenia
- [ ] NVDA: Middleman, karta usługi i druk
- [ ] Wejście głosowe w Chrome, Safari i Firefox

## Notatki

- axe i klawiaturę sprawdzono skryptami Playwright poza repo (nie ma ich w CI). Warto dodać `npm run a11y`.
- axe nie sprawdza treści ani kolejności czytania; NVDA i głos wymagają człowieka ze sprzętem.
- Audyt z kodu: kontrast obramowań kontrolek (`--line-strong` ≥ 3:1) i Esc/Tab w oknie potwierdzenia w panelu (#53). Otwarte: brak ostrzeżenia o wygaśnięciu sesji panelu (token statyczny, do potwierdzenia z backendem).
