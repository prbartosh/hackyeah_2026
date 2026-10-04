# 0027. Znak Splotu i ornamenty małopolskie

- Status: todo
- Osoba: 
- PR: 

## Cel

Splot ma rozpoznawalny, regionalny charakter graficzny: własny znak i oszczędne ornamenty inspirowane Małopolską. Ozdoby nie przeszkadzają w czytaniu i nie ma ich w trybie wysokiego kontrastu.

## Kroki

- [ ] Nowy znak Splotu (SVG) w `components/Header.tsx`: splot dwóch nici, np. motyw krajki krakowskiej albo parzenicy góralskiej. Działa w 40 px i jako favicon 16 px, w jednym kolorze (`currentColor`) i w kolorach marki.
- [ ] Zestaw ornamentów SVG jako komponenty lub pliki w `src/assets/ornaments/`: pas wzoru (krajka, wycinanka), kwiat z Zalipia, linia Tatr lub panorama Wawelu jako sylwetka. Wszystko `aria-hidden="true"`, bez tekstu w grafice.
- [ ] Gdzie ornamenty: cienki pas wzoru pod nagłówkiem lub nad stopką, sylwetka Tatr lub Wawelu w tle ekranu startowego czatu i zasobnika (zamiast fioletowo-niebieskich poświat z `zasobnik.css`), kwiat Zalipia przy pustych stanach i na stronie 404.
- [ ] Ornamenty ukryte w `data-theme="high-contrast"` i w druku. W ciemnym motywie przygaszone.
- [ ] Ornamenty nie zmieniają układu: `position: absolute` albo `background-image`, bez przesunięć treści (CLS).
- [ ] Ilustracje pustych stanów (brak wyników, brak szkiców, pusta skrzynka) w tym samym stylu: linia, 2 kolory.
- [ ] Sprawdzić licencję każdego użytego wzoru (rysujemy własne, nie kopiujemy cudzych grafik).

## Notatki

- Zależy od 0026 (kolory).
- Do weryfikacji: tło grani z #60 (`malopolska.css`) może zastąpić „sylwetkę Tatr lub Wawelu” w tle; ustalić zakres przed rysowaniem ornamentów.
- Zasada: mniej znaczy lepiej. Jeden ornament na ekran, interfejs to narzędzie urzędowe, nie folder turystyczny.
- Herb województwa (orzeł w koronie) i logo „Małopolska” tylko za zgodą, patrz 0026.
