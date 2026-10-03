# 0028. Wspólne komponenty i spójność między modułami

- Status: todo
- Osoba: 
- PR: 

## Cel

Przyciski, karty, etykiety, alerty, pola formularzy i stany ładowania wyglądają i działają tak samo w czacie, zasobniku, kreatorze, Middlemanie, testerze i panelu. Dziś każdy moduł ma własne warianty (`.zs-chip` obok `.chip`, `.tag` obok `.badge`, `.similar-cases` z innym promieniem i obramowaniem).

## Kroki

- [ ] Spis istniejących wariantów w `styles/*.css` (przyciski, chipy, tagi, karty, alerty, pola) i decyzja, które zostają. Wynik w Notatkach.
- [ ] Jedna rodzina przycisków: `primary`, `secondary`, `ghost`, `link`, `danger` (usunięcia w panelu), rozmiary `md` i `sm`, stan `loading` ze spinnerem i `aria-busy`. Min. 44×44 px.
- [ ] Jeden komponent chipa lub filtra (`aria-pressed`) zamiast `.chip`, `.zs-chip`, `.btn-option`, z tym samym wyglądem zaznaczenia.
- [ ] Jedna karta (`.card` z wariantem wyróżnionym), wspólna dla wyników czatu, zasobnika, kafli kreatora i pudełek bocznych (`.side-box`).
- [ ] Etykiety statusu (`.badge`, `.tag`, `.result-kind`): jeden komponent z wariantami `info`, `success`, `warning`, `rops` (polecane przez ROPS), zawsze z tekstem lub ikoną, nie samym kolorem.
- [ ] Alerty: `info`, `warning`, `error`, `success` z ikoną Lucide i jednym układem. `.similar-cases` w `index.css` przepisać na tokeny (dziś `border-radius: 0.5rem` i `var(--border, currentColor)`).
- [ ] Pola formularzy: wspólny wzór etykieta + pole + podpowiedź + błąd pod polem, gwiazdka i „(wymagane)” przy polach obowiązkowych. Dotyczy `ReportPage`, `ServiceCardPage`, fiszki, wniosku, testera, logowania do panelu.
- [ ] Ikony: tylko Lucide, rozmiary jako tokeny (16, 20, 24), jedna grubość linii. Znaki tekstowe `▸` w `details > summary` i `←` w linkach powrotu zamienić na ikony z `aria-hidden`.
- [ ] Animacje: jeden zestaw czasów i krzywych (`--dur-fast` 150 ms, `--dur` 250 ms), wyłączone przy `prefers-reduced-motion` (już jest globalnie).
- [ ] Usunąć nieużywane style po migracji. Build i lint bez błędów.

## Notatki

- Zależy od 0026. Bez nowych bibliotek UI: zostajemy przy własnym CSS na tokenach (Tailwind jest zainstalowany, ale nieużywany w komponentach, więc nie mieszamy dwóch podejść).
- Każda zmiana komponentu: sprawdzić axe i klawiaturę na trasach, gdzie występuje.
