# 0020. Dopracowanie UI: spokojny wygląd i płynność

- Status: w toku
- Osoba: Nikodem
- PR: 

## Cel

Strony publiczne i panel administratora wyglądają jak spokojny serwis publiczny (czytelna typografia, jeden kolor akcentu, mało cieni i ozdobników), bez skoków układu przy ładowaniu i z logicznymi przejściami między modułami. Dostępność bez regresji (axe 0 naruszeń, `prefers-reduced-motion`).

## Kroki

- [x] Podstawy: tokeny, typografia, przyciski, karty, szkielety ładowania, przejścia
- [x] Strony publiczne: czat i wyniki, Zasobnik, innowacja, karta usługi, dokument, zgłoś, wątek
- [x] Przepływ: czat → innowacja → wdrożenie → zgłoś
- [ ] Panel administratora
- [ ] axe 0 naruszeń, build, lint, testy

## Notatki

- 2026-10-04, etap 1 (podstawy i strony publiczne): tokeny w `index.css` (kolory 3 motywów, skala pisma i odstępów, zaokrąglenia 4–8 px, cień tylko jako krawędź), bez gradientów i poświat, przyciski i pola prostokątne. Wyniki czatu i Zasobnik jako lista z liniami zamiast siatki pływających kart. Usunięte ozdobne ikony (Sparkles, strzałki, gwiazdka). Szkielety ładowania (`components/Skeleton.tsx`) na innowacji, karcie wdrożenia, dokumencie, Zasobniku i wątku. Przejścia do 200 ms (opacity/transform), wyłączone przy `prefers-reduced-motion`.
- Czat: strumień nie szarpie przewijaniem (płynnie tylko przy nowej wiadomości, kolejne fragmenty bez animacji i tylko gdy koniec rozmowy jest na ekranie), fokus na wynikach po końcu tury (bez przesunięcia po zniknięciu wskaźnika pisania).
- Przepływ: na innowacji box „Co dalej” (wdrożenie, finansowanie, pytanie do ROPS z wpisanym tematem); ścieżka nawigacji i powrót z karty wdrożenia zachowują wejście z Zasobnika lub z wyników; zgłoszenie i wątek mają linki dalej.
- Poprawka: tekst dokumentu na telefonie przewijał stronę w poziomie. Ikona „✓” w przełączniku motywu dostawała styl `.check` z `admin.css`.
- axe (WCAG 2.1 A/AA, Playwright + axe-core 4.13): 10 stron publicznych × 3 motywy × desktop i 390 px, 0 naruszeń, bez poziomego przewijania; czat z wynikami (DeepSeek) w 3 motywach, desktop i 390 px, 0 naruszeń. Panel administratora jeszcze nie przejrzany (wspólne tokeny działają, wygląd bez zmian poza tokenami).
