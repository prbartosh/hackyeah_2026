# 0014. Licencje danych ROPS

- Status: todo
- Osoba: Wiktor (autor scraperów)

## Cel

Wiemy, na jakiej licencji lub zasadach możemy pokazywać raporty, publikacje, Mapę Wyzwań i wskaźniki Obserwatora, i mamy to wpisane w materiałach dla jury ([0011](0011-materialy-dla-jury.md)) oraz przy dokumentach w Zasobniku ([0003](0003-zasobnik-wiedzy.md)). Dla innowacji mamy CC BY 4.0. Dla reszty w repo nie ma żadnej informacji.

## Kroki

- [ ] Sprawdzić na stronach źródłowych, czy podana jest licencja lub zasady wykorzystania: raporty z badań, publikacje, Mapa Wyzwań Społecznych, Obserwator Statystyk Społecznych (źródła w README w `assets/`)
- [ ] Dla Obserwatora sprawdzić też warunki dla danych źródłowych (GUS, MRPiPS, inne z pola `description.Źródło` w `indicators.json`)
- [ ] Jeśli strona nie podaje licencji: napisać do ROPS (iws@rops.krakow.pl) z pytaniem o zasady wykorzystania
- [ ] Wynik wpisać do `assets/*/README.md` i tabeli „Źródła danych i licencje” w [docs/jury/README.md](../jury/README.md)
- [ ] Zdecydować z zespołem, co pokazujemy przy dokumentach: licencja, jeśli jest, albo samo źródło i link, jeśli licencji nie ma
- [ ] Sprawdzić, czy scraper zapisuje licencję, jeśli strona ją podaje. Jeśli nie, dodać pole

## Notatki

- Nie zakładamy licencji. Brak informacji zostaje w dokumentach jako „licencja nieustalona”, dopóki nie ma odpowiedzi.
