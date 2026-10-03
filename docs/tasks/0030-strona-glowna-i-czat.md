# 0030. Strona główna, czat i wyniki matchmakingu

- Status: todo
- Osoba: 
- PR: 

## Cel

Moduł obowiązkowy (matchmaking) jest najmocniejszym ekranem aplikacji. Nowa osoba w kilka sekund rozumie, co robi Splot, ufa źródłu (ROPS) i widzi postęp rozmowy. Wyniki da się porównać, zapisać i przekazać dalej. Cała obecna funkcjonalność czatu zostaje: role, pytania z opcjami, „Inne”, głos, „Pokaż wyniki teraz”, panel „Twój problem”, dane gminy, podobne przypadki, „Zgłoś potrzebę”.

## Kroki

### Ekran startowy

- [ ] Nad polem czatu krótki opis w prostym języku (1 zdanie) i trzy kroki „Opisz problem → Odpowiedz na kilka pytań → Zobacz sprawdzone rozwiązania”.
- [ ] Pasek zaufania pod polem: „115 innowacji z Biblioteki ROPS”, „Bez logowania”, „Nie zapisujemy rozmów”. Liczby z API, nie wpisane na sztywno.
- [ ] Podpowiedzi (`EXAMPLES` w `ChatPanel.tsx`) jako karty z ikoną i jednym zdaniem, nie same chipy. Treść bez zmian.
- [ ] Pod czatem kafle innych modułów: Zasobnik wiedzy, Kreator pomysłów, Zgłoś potrzebę. Dziś pierwszy ekran prowadzi tylko do czatu.
- [ ] Tło ekranu startowego z ornamentem z 0027.

### Rozmowa

- [ ] Wskaźnik postępu: „Pytanie 2 z maks. 4” (limit rund z ADR 0005), widoczny i ogłaszany przez czytnik.
- [ ] Odpowiedzi z opcjami jako większe kafle z pełnym tekstem, opcja „Inne” wyraźnie oddzielona.
- [ ] Awatar asystenta: znak Splotu zamiast kółka w kolorze `--primary`.
- [ ] Panel „Twój problem”: pasek wypełnienia (np. 3/5), zwięzłe ikony przy polach, „nowe” z animacją, która gaśnie po chwili. Na mobile `details` zostaje.
- [ ] Przycisk „Pokaż wyniki teraz” opisany jako drugorzędny, z podpowiedzią, że rozmowa da lepsze dopasowanie.

### Wyniki

- [ ] Karta głównego dopasowania wyraźnie większa: kategoria z ikoną, „Dlaczego pasuje” jako wyróżniony cytat, ikony przy materiałach (ZIP, PDF, film) zamiast linków oddzielonych kropką.
- [ ] Karty uzupełniające w siatce 2 kolumn, wszystkie przyciski w tym samym miejscu karty.
- [ ] Akcje dla całych wyników: „Drukuj lub zapisz PDF”, „Kopiuj link” (jeśli backend da trwały link; jeśli nie, tylko druk). Styl druku z nagłówkiem Splotu.
- [ ] „Podobne przypadki” jako karta z liczbą w dużej czcionce i listą innowacji, zgodna z 0028.
- [ ] Brak dopasowania: ilustracja z 0027, jasny komunikat i główny przycisk „Zgłoś potrzebę do ROPS”.
- [ ] Ładowanie wyników: szkielety kart zamiast samego tekstu „Splot pisze…”, jeśli trwa dłużej niż 1 s.

## Notatki

- Zależy od 0026–0028.
- Nie ruszać kontraktu SSE ani `ChatContext.tsx` poza tym, co potrzebne do wyświetlenia. Ścieżka fokusu na nagłówku wyników po nowych wynikach zostaje (dostępność).
- Animacja FLIP pola pisania w `ChatPanel.tsx` zostaje.
