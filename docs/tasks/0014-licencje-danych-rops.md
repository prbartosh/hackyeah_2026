# 0014. Licencje danych ROPS

- Status: zrobione
- Osoba: Wiktor (autor scraperów)
- PR: #27

## Jak działa

- Innowacje: CC BY 4.0.
- Raporty: CC BY 4.0 przy 5 z 51 (ids 1479, 1348, 1310, 1257, 1105). Scraper zapisuje pole `licencja` (`CC BY 4.0` albo `null`) w `assets/raporty/metadata.json`.
- Publikacje, Social Canvas, Mapa Wyzwań, Obserwator: strona i PDF nie podają licencji.
- Dane GUS w Obserwatorze (ok. 100 z 184 wskaźników): wolno kopiować i używać z podaniem źródła ([stat.gov.pl/copyright](https://stat.gov.pl/copyright)). Przy każdym wskaźniku podajemy źródło z `indicators.json`.
- W Zasobniku licencję pokazujemy tylko tam, gdzie jest. Przy pozostałych dokumentach samo źródło i link, bez słowa „licencja”.
- Opis źródeł i licencji: `assets/*/README.md` i tabela w [docs/jury/README.md](../jury/README.md) („licencja nieustalona” tylko tam).
