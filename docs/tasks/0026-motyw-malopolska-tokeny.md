# 0026. Motyw Małopolska: kolory, typografia, tokeny

- Status: todo
- Osoba: 
- PR: 

## Cel

Cała aplikacja ma wygląd regionalny (Małopolska), a nie ogólny „niebieski SaaS”. Zmieniamy tylko tokeny i style, bez zmian logiki. Trzy motywy z paska dostępności (jasny, ciemny, wysoki kontrast) działają dalej i każdy spełnia WCAG 2.1 AA. Pozostałe zadania UI (0027–0034) korzystają z tych tokenów.

## Kroki

- [ ] Sprawdzić System Identyfikacji Wizualnej Województwa Małopolskiego (malopolska.pl/marka-malopolska) i spisać w Notatkach kolory i zasady użycia znaku. Nie zgadujemy wartości HEX. Logo województwa i herb tylko za zgodą i zgodnie z księgą znaku. Bez zgody tworzymy własny znak Splotu „w duchu” regionu.
- [ ] Paleta jasna w `styles/index.css` (`:root`). Kierunek: czerwień małopolska (herb) jako akcent marki, granat (Wisła, Tatry) jako `--primary` w przyciskach i linkach, złoto (Wawel, korona) jako akcent dekoracyjny, ciepłe tło (len, papier) zamiast `#f5f7fc`. Każda para tekst/tło ≥ 4,5:1, elementy UI ≥ 3:1.
- [ ] Nowe tokeny semantyczne: `--accent` (czerwień), `--accent-gold`, `--surface-warm`, `--info`, `--warning`, `--success`, `--error` z wariantami `-soft` i `on-*`. Usunąć bezpośrednie kolory z modułów: `#000`/`#fff` w `kreator.css`, `zasobnik.css` i `service-card.css` (oprócz masek i druku), `rgba(...)` poświat w `zasobnik.css`.
- [ ] Motyw ciemny: te same barwy, przyciemnione i mniej nasycone, nie odwrócone. Kontrast sprawdzony osobno.
- [ ] Wysoki kontrast: bez zmian merytorycznych (żółty na czarnym), sprawdzić, że nowe tokeny (`--accent*`) też są nadpisane.
- [ ] Typografia: zostać przy Open Sans albo przejść na krój o wysokiej czytelności (np. Atkinson Hyperlegible Next, Lexend) z pełnymi polskimi znakami (ą, ę, ł, ż, ź, ć, ń, ó, ś). Nagłówki mogą mieć krój z charakterem (np. szeryfowy), treść zostaje bezszeryfowa.
- [ ] Fonty hostowane lokalnie (`@fontsource` albo pliki w `public/`) zamiast Google Fonts w `index.html`: mniej zapytań do zewnętrznych serwerów (RODO w sektorze publicznym), działa offline na pokazie. `font-display: swap`.
- [ ] Skala typografii i odstępów jako tokeny (`--fs-*`, `--space-*` w rytmie 4/8 px), promienie (`--radius-sm/md/lg`), cienie (`--shadow-1/2`), z-index (`--z-sticky`, `--z-overlay`, `--z-skip`).
- [ ] `favicon` w `index.html` w nowych kolorach, `theme-color` w meta dla jasnego i ciemnego motywu.
- [ ] axe na wszystkich trasach w 3 motywach × 2 szerokościach (skrypt z 0022): 0 naruszeń. Ręcznie: duży i bardzo duży tekst.

## Notatki

- Priorytet: najwyższy z zadań UI. Bez tego 0027–0034 nie mają na czym stanąć.
- Kryteria: 10% za atrakcyjność UI, 20% za dostępność. Zmiana motywu nie może obniżyć wyniku axe.
- Klucze `hubmi-theme` i `hubmi-font-size` w `localStorage` zostają (skrypt w `index.html` i `AccessibilityContext.tsx`).
- Sprawdzić z ROPS lub w regulaminie, czy wolno używać znaku „Małopolska”. Jeśli nie, motyw opiera się na barwach i ornamentach (0027), bez logo.
