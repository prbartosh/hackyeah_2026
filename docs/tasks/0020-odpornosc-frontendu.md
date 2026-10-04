# 0020. Odporność frontendu

- Status: w toku
- Osoba: Daniel
- PR: 

## Cel

Frontend nie pokazuje białego ekranu przy awarii, ładuje się szybciej, nie wysyła danych użytkownika do Google i ma domknięte luki dostępności.

## Kroki

- [x] Granice błędów (`ErrorBoundary`): wokół `App`, `Outlet` w `Layout` (reset przy zmianie trasy) i bloków czatu; 503 odróżniony od awarii technicznej; `useItems` z komunikatem po polsku
- [x] Lazy loading tras: panel, Kreator, `ReportPage`, `ThreadPage`, `ServiceCardPage`, `DocumentPage`; jeden `Suspense` w `Layout`, błąd chunka kończy w granicy błędów. Główny bundle 462 → 352 kB
- [x] Czcionki lokalnie: Open Sans z `@fontsource` (latin, latin-ext), bez Google Fonts, preload wagi 400
- [x] Dostępność: `useDocumentTitle`, focus na `<main>` i zapowiedź tytułu po zmianie trasy, skip link w panelu, focus w czacie, stan nagrywania tekstem, `prefers-reduced-motion`, zoom 200% i reflow 320 px, axe w każdym motywie i rozmiarze tekstu
- [x] `frontend/tsconfig.*.tsbuildinfo` poza repo, `npm run lint`, `build`, `test` przechodzą
- [ ] Czat: potwierdzone w NVDA, że odpowiedź nie jest czytana wielokrotnie podczas strumienia i jest czytana po zakończeniu
- [ ] Jedna sesja NVDA: strona główna → czat → wyniki → karta innowacji; Zasobnik; Kreator; panel; formularz ocen
- [ ] Raport z NVDA w `docs/`, odhaczenie punktu NVDA w zadaniach 0003 i 0022

## Notatki

- Testy ręczne wykonano automatem (Playwright + axe, API zamockowane). Zostaje tylko NVDA: potrzebna osoba z NVDA i ok. 1,5 godziny.
- Granica błędów łapie tylko błędy renderu; błędy `streamChat` obsługiwane osobno.
- Przy nawigacji react-router używa transition, więc przy wolnym chunku zostaje stara strona zamiast fallbacku `Suspense` (fallback widać przy twardym wejściu).
- Focus po zmianie trasy trafia na `<main>`, nie `h1`: `h1` leniwych stron nie istnieje w chwili zmiany trasy.
- Zewnętrzne zasoby: tylko linki do ROPS i `VideoEmbed` (youtube-nocookie, po kliknięciu).
- Do potwierdzenia: „Osoba: Daniel” (założenie), kto ma NVDA, numer PR (pole `PR` puste, kod jest w main).
