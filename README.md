# Splot

Splot pomaga znaleźć sprawdzone rozwiązanie problemu społecznego w Bibliotece Innowacji Społecznych ROPS Kraków. Mieszkaniec, pracownik OPS albo urzędnik gminy opisuje sprawę swoimi słowami, AI dopytuje o szczegóły i pokazuje do pięciu innowacji, które już działają w Małopolsce, z wyjaśnieniem, dlaczego pasują. Wokół tego jest wszystko, czego potrzeba dalej: biblioteka wiedzy, kreator pomysłów, karta wdrożenia dla instytucji, kontakt z ROPS bez zakładania konta i panel dla pracowników ROPS.

**Demo:** https://splot.drogos.dev/ · **Film:** https://youtu.be/W2gabERpP3E · **Masz kilka minut?** [SEDZIA.md](SEDZIA.md)

## Jak obejrzeć

- **Film:** [prezentacja Splotu na YouTube](https://youtu.be/W2gabERpP3E).
- **2 minuty:** przycisk **„Dla sędziego (2 min)”** w nagłówku. Przewodnik na żywo: opis problemu, pytanie AI, wyniki z uzasadnieniem i karta innowacji.
- **Całość:** przycisk **„Przewodnik”**. 10 rozdziałów, ok. 45 minut, wszystko na żywo (prawdziwy model AI, prawdziwe formularze, panel ROPS). Rozdziały można wybierać w spisie albo otworzyć adresem, np. `/?przewodnik=panel`.

W każdej chmurce przycisk **„Zrób to za mnie”** wykonuje krok za Ciebie.

## Co jest w Splocie

| Moduł | Gdzie | Co robi |
|---|---|---|
| I Wyszukiwarka innowacji | `/` | Czat z AI: rozpoznaje rolę, zadaje krótkie pytania, pokazuje do 5 innowacji z uzasadnieniem i dane gminy z Obserwatora Statystyk ROPS |
| II Zasobnik wiedzy | `/zasobnik` | 115 innowacji, raporty, publikacje, Mapa Wyzwań i wskaźniki. Szukanie po słowach i po znaczeniu, w treści dokumentów |
| III Kreator pomysłów | `/kreator` | Fiszka pomysłu z pomocą AI, podobne innowacje, nabory, szkic wniosku do pobrania, canvy |
| IV Tester innowacji | karta innowacji | Opinie instytucji, które testują rozwiązanie, poziom dowodu, pytania do testujących przez ROPS |
| V Kontakt z ROPS | `/wspolpraca` | Zgłoszenie potrzeby bez konta z prywatnym linkiem do rozmowy, pytania i odpowiedzi, mentorzy, giełda partnerstw |
| VI Panel pracownika ROPS | `/admin` | Skrzynka zgłoszeń z analizą AI, import dokumentu do karty innowacji, karty, radar potrzeb, moderacja |
| VII Middleman innowacji | karta innowacji | Karta wdrożenia dopasowana do typu instytucji: kroki, koszty, ryzyka, do wydruku |

Do tego porównanie do trzech innowacji (`/porownaj`) i otwarte dane w CSV i JSON (`/otwarte-dane`).

## Na co warto zwrócić uwagę

- **Trafność:** na 35 testowych zgłoszeniach trafna innowacja była w pierwszej trójce za każdym razem (35/35). Zestaw: [docs/zestaw-testowy.md](docs/zestaw-testowy.md).
- **Dostępność:** trzy motywy (w tym wysoki kontrast), powiększanie tekstu, czytanie na głos, „Powiedz prościej”, wejście głosowe, pełna obsługa klawiaturą. Automatyczny audyt axe: 0 naruszeń na wszystkich stronach w trzech motywach i na telefonie. Deklaracja: `/dostepnosc`.
- **AI pod kontrolą człowieka:** w panelu AI podpowiada odpowiedź i dopasowanie, ale wysłanie i publikację zatwierdza pracownik ROPS.
- **Bez konta:** zgłoszenia, pytania i rozmowy działają przez prywatny link, bez rejestracji i bez ujawniania adresów e-mail między stronami.

## Prywatność

Czat nie zapisuje rozmów w bazie Splotu. Treść rozmowy trafia do zewnętrznego dostawcy modelu AI, żeby mógł odpowiedzieć. Użytkownik widzi tę informację przy polu czatu i jest proszony o niewpisywanie danych wrażliwych. Przed uruchomieniem publicznym trzeba opisać dostawcę, podstawę przetwarzania i okres przechowywania w polityce prywatności.

Zapisujemy tylko anonimowe potrzeby (rola, pokazane innowacje, bez treści rozmowy). Serwer nie zapisuje adresów IP ani pełnych adresów stron. Zgłoszenia, fiszki i oceny, które użytkownik świadomie wysyła, trafiają do bazy i skrzynki panelu.

## Dane i licencje

| Dane | Źródło | Licencja |
|---|---|---|
| 115 innowacji | [Biblioteka Innowacji Społecznych ROPS Kraków](https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie) | CC BY 4.0, przy każdej innowacji źródło i licencja |
| Raporty z badań (51) | [ROPS Kraków](https://rops.krakow.pl/badania-analizy-raporty/raporty-z-badan) | 5 raportów CC BY 4.0, pozostałe: licencja nieustalona |
| Publikacje (3), Social Canvas | [ROPS Kraków](https://rops.krakow.pl/innowacje-spoleczne/publikacje-ze-swiata-innowacji) | licencja nieustalona |
| Mapa Wyzwań Społecznych | [ROPS Kraków (PDF)](https://rops.krakow.pl/mpliki/IS/IWS_20/za._nr_2._Mapa_Wyzwa_Spoecznych.pdf) | licencja nieustalona |
| Wskaźniki | [Obserwator Statystyk Społecznych](https://obserwator.rops.krakow.pl/), dane m.in. z GUS i MRPiPS | licencja nieustalona; dane GUS z podaniem źródła ([stat.gov.pl/copyright](https://stat.gov.pl/copyright)) |

Dane pobrano 2026-10-03. Gdy źródło nie podaje licencji, pokazujemy samo źródło i link. Więcej o danych: [docs/baza-innowacji.md](docs/baza-innowacji.md).

## Uruchomienie u siebie

Wymagany Docker.

```bash
cp .env.example .env    # ustaw POSTGRES_PASSWORD, LLM_API_KEY (DeepSeek), ADMIN_TOKEN
docker compose up --build
```

Dane demo, na których opiera się przewodnik (raz, gdy aplikacja działa):

```bash
docker compose exec backend python scripts/seed_demo.py
docker compose exec backend python scripts/seed_kreator.py
docker compose exec backend python scripts/seed_tester.py
docker compose exec backend python scripts/seed_demo_extra.py
```

- Aplikacja: http://localhost:8080
- Panel ROPS: http://localhost:8080/admin

Dobrze wiedzieć:

- Pierwszy start pobiera model wyszukiwania (ok. 220 MB), potrzebny jest internet.
- Bez `LLM_API_KEY` czat nie odpowie, reszta działa.
- `DEMO_TOUR_ENABLED=true` (domyślnie w `.env.example`) otwiera panel ROPS bez logowania. Wtedy dostęp do panelu ma każdy, kto otworzy aplikację, więc to ustawienie tylko na demo.
- Hasła do bazy (`POSTGRES_PASSWORD`) nie zmieniaj po pierwszym starcie. Świeża baza: `docker compose down -v`.

## Technologia

Python 3.12 i FastAPI, PostgreSQL 16, React 19 z TypeScript, nginx, Docker Compose. Model językowy: DeepSeek. Szukanie po znaczeniu: lokalny model, bez klucza API.

## Więcej

- [SEDZIA.md](SEDZIA.md): instrukcja na kilka minut
- [KOSZTORYS.md](KOSZTORYS.md): koszt modelu AI i serwera
- [docs/scenariusz-pokazu.md](docs/scenariusz-pokazu.md): scenariusz prezentacji
- [user_scenario.md](user_scenario.md): przykładowi użytkownicy i ich problemy
- [docs/zestaw-testowy.md](docs/zestaw-testowy.md): 35 zgłoszeń testowych i wyniki
- [docs/baza-innowacji.md](docs/baza-innowacji.md): skąd są dane i jak są opisane
- [GLOSSARY.md](GLOSSARY.md): słowniczek
