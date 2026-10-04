# 0022. Dostępność: czytnik ekranu i głos we wszystkich modułach

- Status: w toku
- Osoba: Daniel, Kacper
- PR:

## Cel

Każdy moduł przeszedł ręczny test czytnikiem ekranu (NVDA), a wejście głosowe działa w głównych przeglądarkach. Część automatyczna (axe, klawiatura) jest zrobiona.

## Kroki

- [x] axe (WCAG 2.0–2.2 A i AA, best-practice) na 21 trasach w trzech motywach, 1280 px i 375 px: 0 naruszeń (2026-10-04, lokalnie, dane demo)
- [x] Klawiatura: na 12 trasach Tab dochodzi do wszystkich elementów z widocznym fokusem
- [x] Skrypty w repo: `npm run a11y` (axe) i `npm run a11y:keys` (Tab, fokus, 320 px); pierwszy przebieg: 0 naruszeń na trasach publicznych (2026-10-04)
- [ ] `npm run a11y` z `ADMIN_TOKEN` na panelu `/admin/*` (nie uruchomione w tej sesji) i podpięcie do CI
- [ ] NVDA: Zasobnik wiedzy (`/zasobnik`, strona dokumentu, `/innowacja/:slug`)
- [ ] NVDA: czat i panel „Twój problem”, „Dane gminy”, „Podobne przypadki”
- [ ] NVDA: panel administratora
- [ ] NVDA: kreator pomysłów, fiszka, canvy
- [ ] NVDA: tester innowacji, oceny i zgłoszenia
- [ ] NVDA: Middleman, karta usługi i druk
- [ ] Wejście głosowe w Chrome, Safari i Firefox

## Notatki

- Audyt axe: `cd frontend && npm run a11y` (Playwright + `@axe-core/playwright`; `BASE_URL` domyślnie `http://localhost:8080`, `ADMIN_TOKEN` włącza `/admin/*`). 24 trasy publiczne × 3 motywy (jasny, ciemny, wysoki kontrast) × 1280 i 320 px, tagi WCAG 2.0–2.2 A/AA i best-practice, dodatkowo kontrola poziomego scrolla. Tabela w konsoli, JSON w `frontend/a11y-report/axe.json` (poza gitem), kod wyjścia ≠ 0 przy naruszeniach. Zmienne: `A11Y_ROUTES`, `A11Y_WIDTHS`, `A11Y_THEMES`, `A11Y_SEED=0`.
- Skrypt zakłada dane testowe przez publiczne API (zgłoszenie, fiszka, canva z oznaczeniem „[a11y]”), żeby trasy z tokenem pokazywały prawdziwą stronę. Bez `ADMIN_TOKEN` nie powstają nabór, wniosek i ogłoszenie partnerskie (trasy z atrapą oznaczone `~`), a trasa mentora (`/mentor/...`) zawsze jest atrapą (token tylko w e-mailu).
- Przebieg 2026-10-04: przed poprawkami `/otwarte-dane` miało 1 naruszenie na 320 px we wszystkich motywach (`scrollable-region-focusable`), po wejściu na prawdziwą fiszkę `heading-order` (h3 bez h2 w „Takie rozwiązania już działają”). Oba poprawione, wynik końcowy 0.
- `npm run a11y:keys`: Tab przez `/wspolpraca` i `/watek/:token` (1280 i 320 px), sprawdza widoczny fokus, kolejność, pułapki i poziomy scroll; ręcznie sprawdzono też pomijanie nawigacji, menu „Ustawienia dostępności” (Enter, Tab, Esc) i zmianę motywu klawiaturą.
- axe nie sprawdza treści ani kolejności czytania; NVDA i głos wymagają człowieka ze sprzętem.
- Audyt z kodu: kontrast obramowań kontrolek (`--line-strong` ≥ 3:1) i Esc/Tab w oknie potwierdzenia w panelu (#53). Otwarte: brak ostrzeżenia o wygaśnięciu sesji panelu (token statyczny, do potwierdzenia z backendem).
