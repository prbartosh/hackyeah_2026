# 0014. Licencje danych ROPS

- Status: w toku
- Osoba: Wiktor (autor scraperów)
- PR:

## Cel

Wiemy, na jakiej licencji lub zasadach możemy pokazywać raporty, publikacje, Mapę Wyzwań i wskaźniki Obserwatora, i mamy to wpisane w materiałach dla jury ([0011](0011-materialy-dla-jury.md)) oraz przy dokumentach w Zasobniku ([0003](0003-zasobnik-wiedzy.md)). Dla innowacji mamy CC BY 4.0. Dla reszty w repo nie ma żadnej informacji.

## Kroki

- [x] Sprawdzić na stronach źródłowych, czy podana jest licencja lub zasady wykorzystania: raporty z badań, publikacje, Mapa Wyzwań Społecznych, Obserwator Statystyk Społecznych (źródła w README w `assets/`)
- [ ] Dla Obserwatora sprawdzić też warunki dla danych źródłowych (GUS, MRPiPS, inne z pola `description.Źródło` w `indicators.json`)
- [ ] Jeśli strona nie podaje licencji: napisać do ROPS (iws@rops.krakow.pl) z pytaniem o zasady wykorzystania
- [x] Wynik wpisać do `assets/*/README.md` i tabeli „Źródła danych i licencje” w [docs/jury/README.md](../jury/README.md)
- [ ] Zdecydować z zespołem, co pokazujemy przy dokumentach: licencja, jeśli jest, albo samo źródło i link, jeśli licencji nie ma
- [x] Sprawdzić, czy scraper zapisuje licencję, jeśli strona ją podaje. Jeśli nie, dodać pole

## Notatki

- 2026-10-03, wynik sprawdzenia stron: CC BY 4.0 podaje tylko strona raportów, i to przy 5 z 51 (ids 1479, 1348, 1310, 1257, 1105). Publikacje, Social Canvas, Mapa Wyzwań i Obserwator: brak licencji na stronie i w tekście PDF. Obserwator: warunków GUS i innych źródeł nie sprawdzano.
- Scraper raportów zapisuje teraz pole `licencja` (`CC BY 4.0` albo `null`).
- Do zrobienia: mail do ROPS (iws@rops.krakow.pl) w sprawie 46 raportów, publikacji, Mapy Wyzwań i Obserwatora; decyzja zespołu, co pokazujemy przy dokumentach (propozycja: licencja tam, gdzie jest, w pozostałych samo źródło i link).

- Nie zakładamy licencji. Brak informacji zostaje w dokumentach jako „licencja nieustalona”, dopóki nie ma odpowiedzi.
