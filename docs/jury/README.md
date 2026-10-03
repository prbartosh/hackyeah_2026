# Splot: informacje dla jury

Splot to „cyfrowe serce” Małopolskiego Hubu Innowacji Społecznych. Użytkownik opisuje problem własnymi słowami, a system znajduje dopasowane innowacje społeczne z Biblioteki Innowacji ROPS Kraków i uzasadnia, dlaczego pasują. Szkic dla [zadania 0011](../tasks/0011-materialy-dla-jury.md).

## Co jest w demo

- **I Matchmaking:** czat, rola, max 4 rundy pytań, panel „Twój problem”, do 5 wyników z uzasadnieniem, dane gminy z Obserwatora. [DEMO.md](../DEMO.md)
- **II Zasobnik wiedzy** (`/zasobnik`): 115 innowacji, raporty, publikacje, Mapa Wyzwań, wskaźniki, wersja tekstowa dokumentów.
- **III Kreator pomysłów** (`/kreator`), **IV Tester innowacji** (oceny na stronie innowacji), **VII Middleman** (karta wdrożenia na stronie innowacji).
- **V Komunikacja (częściowo):** zgłoszenie bez konta (`/zglos`) i wątek z odpowiedzią ROPS (`/watek/:token`).
- **VI Panel administratora** (`/admin`, logowanie tokenem): [panel-administratora.md](../panel-administratora.md).
- **Dostępność:** WCAG 2.1 AA, pasek dostępności (rozmiar tekstu, motyw), wejście głosowe.

Stan i braki: [status.md](../status.md). Mapowanie na kryteria: [mapowanie-na-kryteria.md](mapowanie-na-kryteria.md). Scenariusz pokazu: [scenariusz-pokazu.md](scenariusz-pokazu.md).

## Jak uruchomić

```bash
cp .env.example .env     # ustaw POSTGRES_PASSWORD, LLM_API_KEY (DeepSeek), ADMIN_TOKEN
docker compose up --build
```

- Aplikacja: http://localhost:8080
- API: http://localhost:8000/docs

Bez `LLM_API_KEY` czat nie odpowie (komunikat o niedostępnym asystencie), a panel działa w trybie uproszczonym. Bez `ADMIN_TOKEN` panel jest wyłączony.

## Zrzuty ekranu

Do dodania po ustabilizowaniu demo.

## Źródła danych i licencje

| Dane | Źródło | Licencja |
|---|---|---|
| 115 innowacji | [Biblioteka Innowacji Społecznych ROPS Kraków](https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie) | CC BY 4.0, przy każdej innowacji źródło i licencja |
| Raporty z badań (51) | [ROPS Kraków](https://rops.krakow.pl/badania-analizy-raporty/raporty-z-badan) | 5 raportów CC BY 4.0, pozostałe 46: licencja nieustalona |
| Publikacje (3), Social Canvas | [ROPS Kraków](https://rops.krakow.pl/innowacje-spoleczne/publikacje-ze-swiata-innowacji) | licencja nieustalona |
| Mapa Wyzwań Społecznych | [ROPS Kraków (PDF)](https://rops.krakow.pl/mpliki/IS/IWS_20/za._nr_2._Mapa_Wyzwa_Spoecznych.pdf) | licencja nieustalona |
| Wskaźniki (184) | [Obserwator Statystyk Społecznych](https://obserwator.rops.krakow.pl/), dane m.in. z GUS i MRPiPS | licencja nieustalona; dane GUS wolno używać z podaniem źródła ([stat.gov.pl/copyright](https://stat.gov.pl/copyright)) |

Dane pobrano 2026-10-03 scraperami z `scrapers/`. „Licencja nieustalona” oznacza, że źródło jej nie podaje, więc pokazujemy samo źródło i link ([0014](../tasks/0014-licencje-danych-rops.md)). Kontakt do ROPS w sprawie zasad wykorzystania: iws@rops.krakow.pl.

## Prywatność

Czat nie zapisuje rozmów. Zapisujemy anonimowe potrzeby (rola, slugi, pokazane innowacje, bez treści rozmowy) do końca demo. Adresów IP nie zapisujemy. Zgłoszenia, fiszki i oceny wysłane przez użytkowników trafiają do bazy i skrzynki panelu.

## Zespół

Bartosz (integracja), Bartłomiej (backend), Daniel i Kacper (frontend), Nikodem i Wiktor (produkt i demo).
