# 0013. Dane gminy z Obserwatora w czacie

- Status: todo
- Osoba: Bartosz (integracja)
- PR:

## Cel

Gdy użytkownik poda gminę w polu „Gdzie”, czat pokazuje kilka wskaźników z Obserwatora Statystyk Społecznych (np. „w Twojej gminie 24% mieszkańców ma 65+ lat”) i może się na nie powołać przy wynikach. Zakres demo z [0007](0007-ustalenia-otwarte.md).

## Kroki

- [ ] Wybrać 6–10 wskaźników, które pasują do kategorii innowacji (np. ludność 65+, podwójne starzenie, beneficjenci pomocy społecznej, stopa bezrobocia, osoby z niepełnosprawnością, ubóstwo). Lista w `indicators.json`
- [ ] `ObserwatorRepository`: wczytuje `assets/obserwator/observations.csv` przy starcie, zostawia tylko wybrane wskaźniki i najnowszy rok z wartością dla każdej gminy
- [ ] Dopasowanie nazwy gminy: bez polskich znaków i wielkości liter. Gminy miejsko-wiejskie mają dwa wiersze (`Bochnia (miasto)`, `Bochnia (wieś)`), wtedy pokazać oba albo dopytać
- [ ] Narzędzie modelu (propozycja: `gmina_stats(gmina)`) zwraca wskaźniki z rokiem i źródłem. Model nie podaje liczb spoza tego narzędzia
- [ ] Nowe zdarzenie SSE dla panelu „Twój problem”: blok „Dane gminy” pod „Gdzie”, z rokiem i linkiem do Obserwatora
- [ ] Decyzję dopisać do ADR 0005 albo w nowym ADR (nowe narzędzie zmienia stały zestaw narzędzi i jednorazowo unieważnia cache promptu)
- [ ] Testy: znana gmina, gmina miejsko-wiejska, nieznana nazwa, brak danych dla wskaźnika

## Notatki

- `observations.csv` ma ok. 403 tys. wierszy, wszystkie kolumny są tekstem, `value` może mieć `%`. Format w `assets/obserwator/README.md`.
- Front: pole „Gdzie” i panel robią Daniel i Kacper. Zdarzenie SSE uzgodnić z nimi przed implementacją.
