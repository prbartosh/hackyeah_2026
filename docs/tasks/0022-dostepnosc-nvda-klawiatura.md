# 0022. Dostępność: czytnik ekranu i głos we wszystkich modułach

- Status: w toku
- Osoba: Daniel, Kacper
- PR:

## Cel

Każdy moduł przeszedł ręczny test czytnikiem ekranu (NVDA), a wejście głosowe działa w głównych przeglądarkach. Dostępność jest kryterium oceny. Część automatyczna (axe i klawiatura) jest zrobiona.

## Kroki

- [x] axe (WCAG 2.0–2.2 A i AA oraz best-practice) na 21 trasach (publiczne, kreator, panel, 404) w trzech motywach, na desktopie (1280 px) i mobile (375 px): 0 naruszeń (2026-10-04, lokalnie, dane demo)
- [x] Klawiatura: na 12 sprawdzanych trasach Tab dochodzi do wszystkich widocznych elementów, każdy ma widoczny fokus (pole czatu i wyszukiwarka mają ramkę na kontenerze przez `:has(:focus-visible)`)
- [ ] NVDA: Zasobnik wiedzy (`/zasobnik`, strona dokumentu, `/innowacja/:slug`)
- [ ] NVDA: czat i panel „Twój problem”, blok „Dane gminy” i „Podobne przypadki”
- [ ] NVDA: panel administratora
- [ ] NVDA: kreator pomysłów, fiszka, canvy
- [ ] NVDA: tester innowacji, oceny i zgłoszenia
- [ ] NVDA: Middleman, karta usługi i druk
- [ ] Wejście głosowe sprawdzone w Chrome, Safari i Firefox

## Notatki

- axe i test klawiaturą uruchomione skryptami Playwright poza repo (Chromium z Playwrighta, `axe-core`). Nie ma ich w CI. Warto je dodać (np. `npm run a11y`), jeśli zespół chce powtarzać pomiar.
- axe nie sprawdza treści ani kolejności czytania. Testy NVDA i wejścia głosowego wymagają człowieka z odpowiednim sprzętem.
