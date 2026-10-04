# 0046. Przewodnik po platformie

- Status: w toku
- Osoba: Nikodem
- PR:

## Cel

Przycisk „Przewodnik” w nagłówku prowadzi krok po kroku przez wszystkie funkcje Splotu, na żywo: prawdziwy czat z AI, prawdziwe zgłoszenia, panel ROPS. Dla zespołu przed prezentacją i dla jury. Chmurki stoją nad omawianym elementem, rozdziały odpowiadają modułom.

## Ustalenia

- Wszystko na żywo, koszt API bez znaczenia.
- Panel: przewodnik prosi o zalogowanie zwykłym formularzem i czeka. Automatyczne logowanie: do decyzji zespołu.
- Kontrakt: `frontend/src/tour/types.ts`. Treść: jeden plik na rozdział w `frontend/src/tour/chapters/`, kolejność w `chapters/index.ts`. Silnik: `frontend/src/tour/engine/`.
- Cele chmurek: atrybut `data-tour="<rozdział>-<element>"` w komponentach (kebab-case, np. `czat-pole`, `zasobnik-szukaj`). Nie selektory CSS.
- Elementy wspólne (nagłówek, nawigacja, pasek dostępności) oznacza silnik: `logo`, `nav-wyszukiwarka`, `nav-zasobnik`, `nav-kreator`, `nav-zglos`, `nav-wspolpraca`, `dostepnosc-tekst`, `dostepnosc-motyw`, `przewodnik-przycisk`.
- Start: przycisk w nagłówku lub `?przewodnik=1` (opcjonalnie `?przewodnik=<id rozdziału>`).

## Kroki

- [ ] Silnik: chmurka z podświetleniem, przejścia między trasami, spis rozdziałów, postęp, wznowienie, klawiatura, czytnik ekranu, 3 motywy, telefon
- [ ] Treść rozdziałów: start, czat, zasobnik, innowacja, tester, middleman, kreator, wspolpraca, siec, panel
- [ ] Atrybuty `data-tour` w komponentach
- [ ] Przejście całego przewodnika na stacku (Playwright), axe przy otwartej chmurce
- [ ] README dla jury: link `?przewodnik=1`

## Notatki
