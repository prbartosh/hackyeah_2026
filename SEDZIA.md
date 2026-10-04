# Splot: instrukcja dla sędziego

Splot pomaga mieszkańcom, pracownikom OPS i gminom znaleźć sprawdzone rozwiązanie swojego problemu w Bibliotece Innowacji ROPS Kraków. Opisujesz sprawę swoimi słowami, AI dopytuje i pokazuje pasujące innowacje.

**Demo:** https://ADRES-DEMO (nic nie trzeba instalować)

## Masz 2 minuty

1. Otwórz demo.
2. Kliknij w nagłówku **„Dla sędziego (2 min)”**.
3. Klikaj **„Zrób to za mnie”** w każdej chmurce. Przewodnik sam wpisze przykładowy problem, wyśle go do AI i pokaże wyniki z uzasadnieniem.

Wszystko dzieje się na żywo: prawdziwy model AI, prawdziwa baza innowacji ROPS. Odpowiedź modelu trwa kilka sekund.

## Masz więcej czasu

Kliknij **„Przewodnik”** w nagłówku. To pełne przejście przez wszystkie 7 modułów zadania w 10 rozdziałach (ok. 45 minut). Każdy rozdział można otworzyć osobno, np.:

| Co | Adres |
|---|---|
| Wyszukiwarka z czatem AI (moduł I) | `/?przewodnik=czat` |
| Zasobnik wiedzy (moduł II) | `/?przewodnik=zasobnik` |
| Kreator pomysłów (moduł III) | `/?przewodnik=kreator` |
| Tester innowacji (moduł IV) | `/?przewodnik=tester` |
| Kontakt z ROPS bez konta (moduł V) | `/?przewodnik=wspolpraca`, `/?przewodnik=siec` |
| Panel pracownika ROPS (moduł VI) | `/?przewodnik=panel` |
| Middleman, karta wdrożenia (moduł VII) | `/?przewodnik=middleman` |

Do panelu ROPS przewodnik wchodzi sam, bez logowania.

## Na co warto zwrócić uwagę

- **Trafność:** na 35 testowych zgłoszeniach trafna innowacja była w pierwszej trójce za każdym razem (35/35).
- **Dostępność:** trzy motywy (w tym wysoki kontrast), większy tekst, czytanie na głos, „Powiedz prościej”, pełna obsługa klawiaturą. Automatyczny audyt axe: 0 błędów na wszystkich stronach.
- **AI pod kontrolą człowieka:** w panelu AI podpowiada, ale odpowiedź i publikację zatwierdza pracownik ROPS.
- **Prywatność:** zgłoszenia bez zakładania konta, prywatny link do rozmowy z ROPS, rozmowy z czatem nie są zapisywane.

## Uruchomienie u siebie (opcjonalnie)

```bash
cp .env.example .env    # ustaw POSTGRES_PASSWORD, LLM_API_KEY (DeepSeek), ADMIN_TOKEN
docker compose up --build
```

Aplikacja: http://localhost:8080. Szczegóły: [docs/jury/README.md](docs/jury/README.md).
