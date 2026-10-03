# 0013. Dane gminy z Obserwatora w czacie

- Status: review
- Osoba: Bartosz (integracja)
- PR: #31

## Cel

Gdy użytkownik poda gminę w polu „Gdzie”, czat pokazuje kilka wskaźników z Obserwatora Statystyk Społecznych (np. „w Twojej gminie 24% mieszkańców ma 65+ lat”) i może się na nie powołać przy wynikach. Zakres demo z [0007](0007-ustalenia-otwarte.md).

## Kroki

- [x] Wybrać 6–10 wskaźników, które pasują do kategorii innowacji (np. ludność 65+, podwójne starzenie, beneficjenci pomocy społecznej, stopa bezrobocia, osoby z niepełnosprawnością, ubóstwo). Lista w `indicators.json`
- [x] `ObserwatorRepository`: wczytuje `assets/obserwator/observations.csv` przy starcie, zostawia tylko wybrane wskaźniki i najnowszy rok z wartością dla każdej gminy
- [x] Dopasowanie nazwy gminy: bez polskich znaków i wielkości liter. Gminy miejsko-wiejskie mają dwa wiersze (`Bochnia (miasto)`, `Bochnia (wieś)`), wtedy pokazać oba albo dopytać
- [x] Narzędzie modelu (propozycja: `gmina_stats(gmina)`) zwraca wskaźniki z rokiem i źródłem. Model nie podaje liczb spoza tego narzędzia
- [ ] Front: obsługa zdarzenia SSE `gmina_stats` (backend je wysyła, format w ADR 0005). Nowe zdarzenie SSE dla panelu „Twój problem”: blok „Dane gminy” pod „Gdzie”, z rokiem i linkiem do Obserwatora
- [x] Decyzję dopisać do ADR 0005 albo w nowym ADR (nowe narzędzie zmienia stały zestaw narzędzi i jednorazowo unieważnia cache promptu)
- [x] Testy: znana gmina, gmina miejsko-wiejska, nieznana nazwa, brak danych dla wskaźnika

## Notatki

- `observations.csv` ma ok. 403 tys. wierszy, wszystkie kolumny są tekstem, `value` może mieć `%`. Format w `assets/obserwator/README.md`.
- Front: pole „Gdzie” i panel robią Daniel i Kacper. Zdarzenie SSE uzgodnić z nimi przed implementacją.
- 2026-10-03: wybrane wskaźniki są w `assets/obserwator/wskazniki-czatu.json`, a nie w `indicators.json`, bo pod tą nazwą jest już katalog wszystkich 184 wskaźników. Wybór (10): liczba mieszkańców, udział 60+, podwójne starzenie, potencjał opieki rodzinnej, udział korzystających z pomocy społecznej oraz powody pomocy: ubóstwo, niepełnosprawność, bezdomność, przemoc domowa, a także liczba osób w usługach opiekuńczych. Na poziomie gmin brak stopy bezrobocia i udziału osób z niepełnosprawnością (są tylko dla powiatów albo puste), więc zostały powody korzystania z pomocy społecznej. Do przejrzenia przez Nikodema i Wiktora.
- Gmina miejsko-wiejska: backend zwraca oba wiersze, a prompt pozwala modelowi dopytać, o który chodzi. Kraków, Tarnów i Nowy Sącz są w danych tylko jako `powiat m. X` i są dopasowywane po nazwie miasta.
- Wczytanie CSV przy pierwszym zapytaniu czatu trwa ok. 0,6 s, potem dane są w pamięci.
- Nie sprawdzone na prawdziwym modelu.
