# Splot: informacje dla jury

Splot to „cyfrowe serce” Małopolskiego Hubu Innowacji Społecznych. Użytkownik opisuje swój problem własnymi słowami, a system znajduje dopasowane innowacje społeczne z Biblioteki Innowacji ROPS Kraków i uzasadnia, dlaczego pasują. Szkic dla [zadania 0011](../tasks/0011-materialy-dla-jury.md), do uzupełnienia na działającym demo.

## Co jest w demo

- **Matchmaking w czacie (moduł I):** rola użytkownika (mieszkaniec, CUS/OPS, partner), maksymalnie 4 rundy pytań, panel „Twój problem”, do 5 wyników z uzasadnieniem. Szczegóły: [DEMO.md](../DEMO.md).
- **Zasobnik wiedzy (moduł II):** 115 innowacji z filtrami i wyszukiwarką, strona innowacji z filmem i materiałami. Dokumenty ROPS: w przygotowaniu.
- **Middleman innowacji (moduł VII):** karta usługi dla instytucji. W przygotowaniu.
- **Dostępność:** WCAG 2.1 AA, pasek dostępności (rozmiar tekstu, motyw), wejście głosowe.

Mapowanie na kryteria oceny: [mapowanie-na-kryteria.md](mapowanie-na-kryteria.md). Scenariusz pokazu: [scenariusz-pokazu.md](scenariusz-pokazu.md).

## Jak uruchomić

```bash
cp .env.example .env     # ustaw POSTGRES_PASSWORD i LLM_API_KEY (DeepSeek)
docker compose up --build
```

- Aplikacja: http://localhost:8080
- API: http://localhost:8000/docs

Czat potrzebuje klucza DeepSeek `LLM_API_KEY` w `.env`. Bez niego nie odpowie.

## Zrzuty ekranu

Do dodania po ustabilizowaniu demo (strona główna z czatem, wyniki, strona innowacji, `/zasobnik`, karta usługi).

## Źródła danych i licencje

| Dane | Źródło | Licencja |
|---|---|---|
| 115 innowacji | [Biblioteka Innowacji Społecznych ROPS Kraków](https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie) | CC BY 4.0, przy każdej innowacji pokazujemy źródło i licencję |
| Raporty z badań | [ROPS Kraków](https://rops.krakow.pl/badania-analizy-raporty/raporty-z-badan) | do sprawdzenia ([0014](../tasks/0014-licencje-danych-rops.md)) |
| Publikacje | [ROPS Kraków](https://rops.krakow.pl/innowacje-spoleczne/publikacje-ze-swiata-innowacji) | do sprawdzenia ([0014](../tasks/0014-licencje-danych-rops.md)) |
| Mapa Wyzwań Społecznych | [ROPS Kraków (PDF)](https://rops.krakow.pl/mpliki/IS/IWS_20/za._nr_2._Mapa_Wyzwa_Spoecznych.pdf) | do sprawdzenia ([0014](../tasks/0014-licencje-danych-rops.md)) |
| Wskaźniki (184) | [Obserwator Statystyk Społecznych](https://obserwator.rops.krakow.pl/), dane źródłowe m.in. z GUS i MRPiPS | do sprawdzenia ([0014](../tasks/0014-licencje-danych-rops.md)) |

Dane pobrano 2026-10-03 scraperami z `scrapers/`. Kontakt do ROPS w sprawie zasad wykorzystania: iws@rops.krakow.pl ([user_scenario.md](../../user_scenario.md)).

## Prywatność

Backend nie zapisuje rozmów. Zapisujemy tylko anonimowe potrzeby (rola, slugi, pokazane innowacje, bez treści rozmowy), do końca demo. Adresów IP nie zapisujemy.

## Zespół

Bartosz (integracja), Bartłomiej (backend), Daniel i Kacper (frontend), Nikodem i Wiktor (produkt i demo).
