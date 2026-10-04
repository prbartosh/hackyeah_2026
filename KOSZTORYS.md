# Kosztorys

Ile kosztuje utrzymanie Splotu: model AI (DeepSeek) i serwer. Ceny z 4 października 2026, bez VAT.

## W skrócie

| Pozycja | Koszt miesięcznie |
|---|---|
| Serwer (VPS 2 vCPU, 4 GB RAM) | ok. 5,50 EUR |
| Model AI przy 1000 pełnych rozmów | ok. 13 USD (najdroższe godziny), ok. 6,50 USD (pozostałe) |
| Szukanie po znaczeniu | 0 zł, model działa lokalnie na serwerze |

Przy 1000 rozmów miesięcznie utrzymanie kosztuje więc kilkanaście euro.

## Model AI: DeepSeek

Używamy modelu `deepseek-flash` (DeepSeek-V4.1-Flash). Cennik za 1 mln tokenów:

| | Najdroższe godziny | Pozostałe godziny |
|---|---|---|
| Wejście z cache | 0,006 USD | 0,003 USD |
| Wejście bez cache | 0,30 USD | 0,15 USD |
| Wyjście | 1,20 USD | 0,60 USD |

Najdroższe godziny to 01:00–04:00 i 06:00–10:00 UTC w dni robocze. W pozostałych godzinach ceny są o połowę niższe.

### Co zmierzyliśmy

Każde wywołanie modelu wysyła stały opis zadania i katalog 115 innowacji (ok. 46–48 tys. tokenów). Ta część się nie zmienia, więc DeepSeek bierze ją z cache: **ok. 97% tokenów wejścia jest rozliczane po cenie cache**, czyli ok. 50 razy taniej.

**Pełna rozmowa** (opis problemu, pytania AI, wyniki), pomiar na DeepSeek:

| | Wartość |
|---|---|
| Wywołania modelu | 9 |
| Tokeny wejścia | ok. 435 tys., z czego ok. 421 tys. z cache |
| Tokeny wyjścia | ok. 5,2 tys. |
| **Koszt rozmowy** | **ok. 0,013 USD** (najdroższe godziny), ok. 0,0065 USD (pozostałe) |

Liczba wywołań zależy od tego, ile pytań zada model. Krótka rozmowa to 4–6 wywołań i odpowiednio mniej.

**Ewaluacja trafności** (36 zgłoszeń, od opisu od razu do wyników):

| | Wartość |
|---|---|
| Wywołania modelu | 95, średnio 2,6 na zgłoszenie |
| Tokeny wejścia | 4,67 mln, z czego 4,50 mln z cache (96%) |
| Tokeny wyjścia | 66 tys. |
| **Koszt całej ewaluacji** | **ok. 0,16 USD**, czyli ok. 0,004 USD za zgłoszenie |
| Wynik | trafna innowacja w pierwszej trójce w 35 z 35 zgłoszeń |

### Ile to kosztuje przy większym ruchu

| Rozmów miesięcznie | Najdroższe godziny | Pozostałe godziny |
|---|---|---|
| 100 | ok. 1,30 USD | ok. 0,65 USD |
| 1 000 | ok. 13 USD | ok. 6,50 USD |
| 10 000 | ok. 130 USD | ok. 65 USD |

Najgorszy przypadek, gdy cache by nie działał: ok. 0,14 USD za pełną rozmowę, czyli ok. 10 razy drożej. Dlatego pilnujemy, żeby stała część zapytania się nie zmieniała (sprawdza to test automatyczny).

### Pozostałe funkcje z AI

„Powiedz prościej”, karta wdrożenia (Middleman), analiza zgłoszenia w panelu ROPS i pomoc w Kreatorze to pojedyncze wywołania modelu po kliknięciu. Nie mierzyliśmy ich tokenów osobno. Są uruchamiane rzadziej niż czat.

## Serwer

Cała aplikacja (strona, backend, baza PostgreSQL, lokalny model wyszukiwania) działa na jednym serwerze w Dockerze.

| | Minimum | Wygodnie |
|---|---|---|
| Procesor | 2 vCPU | 4 vCPU |
| Pamięć | 4 GB RAM | 8 GB RAM |
| Dysk | 40 GB SSD | 80 GB SSD |

Przykład: Hetzner Cloud CX23 (2 vCPU, 4 GB RAM, 40 GB NVMe) kosztuje 5,49 EUR miesięcznie (dane z sierpnia 2026, centrum danych w Niemczech i Finlandii). Do tego domena, jeśli instytucja nie ma własnej.

## Jak trzymamy koszty pod kontrolą

- **Limity zapytań:** czat, karta wdrożenia i „Powiedz prościej” przyjmują najwyżej 10 zapytań na minutę z jednego adresu, formularze z AI w Kreatorze 20 na minutę.
- **Wyłącznik czatu:** ustawienie `CHAT_ENABLED=false` wyłącza czat bez wdrażania nowej wersji. Reszta Splotu działa dalej.
- **Lokalne wyszukiwanie:** szukanie po znaczeniu w Zasobniku działa na serwerze, bez płatnego API.

## Źródła

- [Cennik DeepSeek API](https://api-docs.deepseek.com/quick_start/pricing)
- [Porównanie cen serwerów w chmurze, sierpień 2026](https://kimmo.suominen.com/stuff/cpc-2026-08.txt)
- Pomiary: logi backendu z ewaluacji na zestawie testowym ([docs/zestaw-testowy.md](docs/zestaw-testowy.md)) i pomiar pełnej rozmowy, 4 października 2026
