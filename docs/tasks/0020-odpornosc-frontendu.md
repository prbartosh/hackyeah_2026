# 0020. Odporność frontendu

- Status: w toku
- Osoba: Daniel
- PR:

## Cel

Frontend nie pokazuje białego ekranu przy awarii, ładuje się szybciej, nie wysyła danych użytkownika do Google i ma domknięte luki dostępności. Cztery punkty, każdy w osobnym commicie, jeden PR.

## Kroki

### 1. Granice błędów

- [x] Wspólny komponent granicy błędów (wariant całostronicowy i blokowy), fallback po polsku z `role="alert"` i przeniesieniem focusu
- [x] Granica wokół `App` w `main.tsx` (wewnątrz `AccessibilityProvider`), przycisk „Odśwież stronę” i link do strony głównej
- [x] Granica w `Layout` wokół `Outlet`, reset przy zmianie `pathname`
- [x] Granice w czacie: lista wiadomości oraz osobno bloki wyników, podsumowania i „Dane gminy”
- [x] Stan „model niedostępny / limit dzienny” (503) odróżniony od awarii technicznej
- [x] `useItems`: komunikat błędu po polsku zamiast `Unknown error`
- [ ] Sprawdzenie ręczne: wymuszony wyjątek w stronie, w trasie i w bloku czatu nie daje białego ekranu

### 2. Lazy loading tras

- [x] Pomiar rozmiaru bundla przed zmianą (`npm run build`)
- [x] Leniwe ładowanie: panel (`admin/*`), Kreator (`kreator/*`), `ReportPage`, `ThreadPage`, `ServiceCardPage`, `DocumentPage`; `HomePage`, `Layout` i `NotFoundPage` zostają w głównym bundlu
- [x] Jeden chunk na obszar (admin, kreator), nie na każdą stronę
- [x] Jeden `Suspense` w `Layout` wokół `Outlet`, dostępny fallback (`role="status"`, stała wysokość)
- [x] Błąd pobrania chunka (po nowym wdrożeniu) kończy w granicy z punktu 1 z propozycją przeładowania
- [x] Pomiar po zmianie, porównanie w opisie PR
- [ ] Przejście przez wszystkie trasy, bezpośredni link `/admin/karty/xyz` po twardym odświeżeniu, wolna sieć w DevTools

### 3. Czcionki lokalnie (RODO)

- [x] Open Sans z pakietu `@fontsource` importowany w `main.tsx`, tylko podzbiory `latin` i `latin-ext` (polskie znaki), tylko używane wagi, `font-display: swap`
- [x] Usunięcie Google Fonts z `index.html` (`preconnect` i arkusz)
- [x] Preload głównego pliku czcionki (waga 400)
- [x] Przeszukanie `src` i `index.html` pod kątem innych zewnętrznych zasobów
- [ ] Sprawdzenie: pusty cache, zero zapytań do domen Google; „ąęłńóśźż” poprawne we wszystkich wagach i trzech motywach
- [x] `npm ci` w Dockerze z nowym `package-lock.json`

### 4. Dostępność

- [x] `useDocumentTitle` w `HomePage`, `InnovationPage` (tytuł z nazwy innowacji), `NotFoundPage` i stronach panelu (9 plików)
- [x] Focus po zmianie trasy (poza pierwszym renderem i nawigacją do kotwicy `#wyniki`) i zapowiedź nowego tytułu strony
- [x] Skip link: cel `#main-content` istnieje też w `AdminLayout`
- [ ] Czat: potwierdzone w NVDA, że odpowiedź nie jest czytana wielokrotnie podczas strumienia i jest czytana po zakończeniu
- [x] Czat: focus po zakończeniu odpowiedzi i po pojawieniu się pytania z opcjami
- [x] Przycisk głosowy: stan nagrywania ogłaszany tekstem, nie tylko kolorem
- [ ] axe w każdym motywie i rozmiarze tekstu
- [x] `prefers-reduced-motion` dla animacji pisania i przewijania
- [ ] Zoom 200% i reflow 320 px
- [ ] Jedna sesja NVDA: strona główna → czat → wyniki → karta innowacji; Zasobnik; Kreator; panel; formularz ocen
- [ ] Raport z NVDA w `docs/`, odhaczenie punktu NVDA w zadaniach 0003, 0015, 0018, 0019

### Sprzątanie i formalności

- [x] `frontend/tsconfig.*.tsbuildinfo`: `git rm --cached` i wpis w `.gitignore` (są śledzone mimo że to artefakty builda)
- [ ] Stan w `docs/status.md` i checkboxy zadań 0003, 0015, 0018, 0019 po teście NVDA, w tym samym PR
- [x] `npm run lint`, `npm run build`, `npm test` przechodzą

## Notatki
- Stan (kod gotowy, 4 commity + sprzątanie na gałęzi `0020-odpornosc-frontendu`): zostały testy ręczne w przeglądarce, axe, zoom/reflow i sesja NVDA. Do tego czasu bez PR i bez `review`.
- Bundle: przed 462,45 kB (gzip 137,71 kB), po 352,09 kB (gzip 109,92 kB) w głównym pliku; admin 54,12 kB (gzip 14,55 kB), kreator 39,68 kB (gzip 11,98 kB) ładowane dopiero po wejściu na trasę.
- Strony panelu miały już `useTitle` (panelowy odpowiednik `useDocumentTitle`), a `AdminLayout` renderuje się wewnątrz `<main id="main-content">` z `Layout`, więc skip link działa. `prefers-reduced-motion` jest już globalnie w `index.css`.
- Zewnętrzne zasoby po przeszukaniu: tylko odnośniki do stron ROPS (klik użytkownika) oraz `VideoEmbed` (youtube-nocookie, ładowany po kliknięciu).
- Focus po zmianie trasy trafia na `<main>`, a nowy tytuł jest zapowiadany w regionie `role="status"` (decyzja w otwartym pytaniu: `<main>`, nie `h1`, bo `h1` leniwych stron nie istnieje w chwili zmiany trasy).

- Kolejność: 1 → 2 → 3 → 4. Punkt 2 korzysta z fallbacku z punktu 1, punkt 4 najlepiej robić na ustabilizowanym kodzie.
- Punkt 2 zmienia `App.tsx`, więc ma wysokie ryzyko konfliktów z gałęziami innych osób. Zrobić szybko i uprzedzić Kacpra.
- Granica błędów łapie tylko błędy renderu, nie handlerów ani kodu asynchronicznego. Błędy `streamChat` są obsługiwane osobno.
- Test z NVDA jest jedyną częścią, której nie da się zautomatyzować. Potrzebna osoba z NVDA i ok. 1,5 godziny.
- Otwarte pytania: czy dodać `jsdom` i React Testing Library (test granicy i focusu), focus po nawigacji na `<main>` czy `h1`, czy objąć osadzone wideo YouTube (`VideoEmbed`, też zapytanie zewnętrzne), kto ma NVDA.
- „Osoba: Daniel” to założenie, do potwierdzenia.
