# 0029. Nagłówek, nawigacja i stopka

- Status: todo
- Osoba: 
- PR: 

## Cel

Użytkownik od razu wie, gdzie jest i co może zrobić. Nagłówek nie jest przeładowany, na telefonie menu jest wygodne, a stopka pokazuje źródła danych, dostępność i kontakt jak na stronie instytucji publicznej.

## Kroki

- [ ] Rozdzielić nagłówek na dwa pasy. Górny, cienki: ustawienia dostępności (tekst, motyw), link „Deklaracja dostępności”, ewentualnie „Panel pracownika”. Główny: znak, nazwa, nawigacja. Dziś w `components/Header.tsx` znak, menu i pasek dostępności zawijają się w jednym wierszu.
- [ ] Nawigacja główna z ikonami i tekstem: Wyszukiwarka, Zasobnik wiedzy, Kreator pomysłów, Zgłoś potrzebę. Wyraźny stan aktywny (dziś tylko podkreślenie 3 px).
- [ ] Mobile (< 48rem): przycisk „Menu” z `aria-expanded`, panel z nawigacją i ustawieniami dostępności, zamykany Esc i kliknięciem poza nim, fokus wraca na przycisk. Pasek dostępności dziś zwija się osobno (`AccessibilityBar.tsx`). Połączyć oba w jedno menu.
- [ ] Opcjonalnie: nagłówek przyklejony przy przewijaniu w górę (bez zasłaniania pola czatu, które też jest przyklejone).
- [ ] Stopka w kolumnach: O Splocie (krótko), Moduły (linki), Dane i licencje (ROPS, Obserwator, CC BY 4.0), Dostępność (deklaracja, skróty), Kontakt (`iws@rops.krakow.pl`). Pas ornamentu z 0027. Dziś to jedna linia w `components/Layout.tsx`.
- [ ] Okruszki w jednym stylu na podstronach (innowacja, dokument, karta usługi, kreator, wątek, panel).
- [ ] Po zmianie trasy fokus na `<h1>` lub `main` i ogłoszenie tytułu strony (dziś tylko `scrollTo(0, 0)` w `Layout.tsx`). Wszystkie strony ustawiają `document.title` (dziś `useDocumentTitle` jest w 11 plikach).
- [ ] Panel pracownika: osobny wygląd nagłówka (np. pasek „Panel ROPS” w innym kolorze), żeby było jasne, że to strefa pracownika.

## Notatki

- Zależy od 0026 i 0027.
- Link do skip-linku i landmarki (`header`, `nav`, `main`, `footer`) zostają.
- Strona „Deklaracja dostępności” to pomysł 3 z `docs/pomysly-na-przewage.md`. Tu tylko miejsce na link.
