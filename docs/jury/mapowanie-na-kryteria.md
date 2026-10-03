# Mapowanie pokazu na kryteria oceny

Szkic dla [zadania 0011](../tasks/0011-materialy-dla-jury.md). Kryteria: [kryteria-oceny.md](../kryteria-oceny.md). Kolumna „Stan” odpowiada [status.md](../status.md) z dnia 2026-10-03 i trzeba ją zaktualizować przed pokazem. Niczego nie wpisujemy jako „zrobione”, dopóki nie działa na demo.

## 40%: spełnienie wyzwania

| Moduł | Co pokazujemy | Gdzie | Stan |
|---|---|---|---|
| I Matchmaking (obligatoryjny, 10%) | Użytkownik opisuje problem w czacie, AI ustala rolę, dopytuje (max 4 rundy), panel „Twój problem”, do 5 innowacji z `why_relevant` | [DEMO.md](../DEMO.md), [ADR 0005](../adr/0005-matchmaking-chat-llm.md) | backend i front czatu gotowe, brak testu na prawdziwym modelu ([0002](../tasks/0002-smoke-test.md)) |
| II Zasobnik wiedzy (+5%) | `/zasobnik`: 115 innowacji z filtrami i wyszukiwarką, strona innowacji z filmem i materiałami. Dokumenty ROPS (raporty, publikacje, Mapa Wyzwań, Obserwator) | [0003](../tasks/0003-zasobnik-wiedzy.md) | innowacje gotowe, dokumenty nie zaczęte |
| VII Middleman innowacji (+5%) | Na stronie innowacji przycisk „Dostosuj do mojej instytucji” i karta usługi dla CUS/OPS i partnera | [0012](../tasks/0012-middleman-innowacji.md) | do zrobienia |
| Dane gminy w czacie (jakość modułu I) | „W Twojej gminie…” z Obserwatora Statystyk | [0013](../tasks/0013-dane-gminy-w-czacie.md) | do zrobienia |

Jakość działania (część 40%): wynik ewaluacji dopasowania na [zestawie testowym](../zestaw-testowy.md) ([0009](../tasks/0009-ewaluacja-dopasowania.md)). Wpisać liczby po pomiarze, nie wcześniej.

Poza zakresem pokazu (nie obiecujemy): kreator pomysłów, tester, platforma komunikacji, panel administratora, trendy potrzeb, PJM i audio.

## 20%: potencjał wdrożeniowy

| Punkt | Argument | Źródło |
|---|---|---|
| Koszt | Jeden model, jeden katalog w prompcie (cache), limity zapytań i budżet dzienny | [0006](../tasks/0006-limity-czatu.md), [ADR 0005](../adr/0005-matchmaking-chat-llm.md) |
| Utrzymanie | Odświeżanie danych scraperem, nakładka niezależna od danych źródłowych, bez ręcznej edycji bazy | [ADR 0004](../adr/0004-obiekt-innowacji.md) |
| Skalowalność | Do 200 innowacji w prompcie, wariant zapasowy z prefiltrem i rerankiem, docelowo PostgreSQL | [ADR 0004](../adr/0004-obiekt-innowacji.md) §8, §10 |
| Prywatność | Backend bezstanowy, rozmowy nie są zapisywane, zapis potrzeb bez treści rozmowy, adresów IP nie zapisujemy | [0004](../tasks/0004-zapis-potrzeb.md), [0006](../tasks/0006-limity-czatu.md) |
| Uczciwość odpowiedzi | `why_relevant` tylko z danych bazy, brak wymyślonych kosztów i kontaktów | [DEMO.md](../DEMO.md) |

Liczby kosztu jednej rozmowy i miesięcznego kosztu: do wpisania po pomiarze w [0002](../tasks/0002-smoke-test.md). Dziś ich nie mamy.

## 20%: dostępność

| Punkt | Stan |
|---|---|
| WCAG 2.1 AA: klawiatura, fokus, `aria-live`, kontrast, powiększenie do 200% | audyt axe na stronie głównej i innowacji, 3 motywy, 0 naruszeń; brak ręcznego testu klawiaturą i czytnikiem ekranu |
| Pasek dostępności (rozmiar tekstu, motyw) | jest, na mobile do poprawy ([0010](../tasks/0010-dostepnosc-mobile-i-glos.md)) |
| Wejście głosowe | w zakresie demo, do sprawdzenia w przeglądarkach ([0010](../tasks/0010-dostepnosc-mobile-i-glos.md)) |
| Prosty język, odpowiedzi do klikania | w przepływie czatu ([DEMO.md](../DEMO.md)) |

## 10%: atrakcyjność i pomysłowość UI

Do opisu po stabilnym demo: czat z panelem „Twój problem”, który wypełnia się na żywo, odpowiedzi do klikania, karty wyników z uzasadnieniem dopasowania, trzy motywy.

## 10%: jakość materiałów i MVP

Zadanie 0011: scenariusz pokazu ([scenariusz-pokazu.md](scenariusz-pokazu.md)), [README dla jury](README.md), nagranie zapasowe, prezentacja (wymagana, zakładamy 10 minut).
