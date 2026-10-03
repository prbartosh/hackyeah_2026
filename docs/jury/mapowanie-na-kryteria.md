# Mapowanie pokazu na kryteria oceny

Szkic dla [zadania 0011](../tasks/0011-materialy-dla-jury.md). Kryteria: [kryteria-oceny.md](../kryteria-oceny.md). Stan zadań: [status.md](../status.md). Niczego nie wpisujemy jako „zrobione”, dopóki nie działa na demo. Nie mamy jeszcze testu z czytnikiem ekranu ani przejścia wszystkich modułów na prawdziwym kluczu DeepSeek.

## 40%: spełnienie wyzwania

| Moduł | Co pokazujemy | Gdzie | Stan |
|---|---|---|---|
| I Matchmaking (obligatoryjny, 10%) | Czat: rola, max 4 rundy pytań, panel „Twój problem”, do 5 innowacji z `why_relevant` | [DEMO.md](../DEMO.md), [ADR 0005](../adr/0005-matchmaking-chat-llm.md) | działa; pełna rozmowa na DeepSeek sprawdzona ([0002](../tasks/0002-smoke-test.md)); „Podobne przypadki” jeszcze nieprojektowane |
| I+ Dane gminy w czacie | Blok „Dane gminy” z Obserwatora pod polem „Gdzie” | [0013](../tasks/0013-dane-gminy-w-czacie.md) | backend i front gotowe, brak testu na prawdziwym modelu |
| II Zasobnik wiedzy (+5%) | `/zasobnik`: 115 innowacji, raporty, publikacje, Mapa Wyzwań, wskaźniki; strona dokumentu z wersją tekstową | [0003](../tasks/0003-zasobnik-wiedzy.md) | działa; brak ręcznego testu czytnikiem ekranu |
| III Kreator pomysłów | `/kreator`: fiszka z AI, nabory i wniosek (DOCX), „Znajdź finansowanie”, canvy, asystent | [0018](../tasks/0018-kreator-pomyslow.md), [opis](../kreator-pomyslow.md) | działa; brak NVDA i przejścia z prawdziwym kluczem |
| IV Tester innowacji | Oceny i zgłoszenia do testów na stronie innowacji, poziom dowodu, moderacja w panelu | [0019](../tasks/0019-tester-innowacji.md), [ADR 0011](../adr/0011-tester-innowacji.md) | działa; brak NVDA |
| V Platforma komunikacji | Częściowo: `/zglos` (zgłoszenie bez konta) i `/watek/:token` (wątek, odpowiedź pracownika ROPS) | [0015](../tasks/0015-panel-administratora.md) | częściowo, bez komunikacji między użytkownikami |
| VI Panel administratora | `/admin`: skrzynka z triażem AI, powiadomienia, import dokumentu → karta, karty, radar, nabory, opinie | [0015](../tasks/0015-panel-administratora.md), [opis](../panel-administratora.md) | działa; brak NVDA i przejścia z prawdziwym kluczem |
| VII Middleman innowacji (+5%) | „Dostosuj do mojej instytucji” → `/innowacja/:slug/wdrozenie`: karta wdrożenia, druk, „Chcę to wdrożyć” | [0012](../tasks/0012-middleman-innowacji.md), [ADR 0009](../adr/0009-middleman-karta-uslugi.md) | działa; brak przejścia z prawdziwym kluczem |

Jakość działania: skrypt ewaluacji dopasowania ([0009](../tasks/0009-ewaluacja-dopasowania.md)) jest, pełnego pomiaru nie zrobiliśmy. Liczb nie wpisujemy.

Poza zakresem: PJM i audio.

## 20%: potencjał wdrożeniowy

| Punkt | Argument | Źródło |
|---|---|---|
| Koszt | Jeden model, jeden katalog w prompcie (cache), limity zapytań w nginx | [0006](../tasks/0006-limity-czatu.md), [ADR 0005](../adr/0005-matchmaking-chat-llm.md) |
| Utrzymanie | Odświeżanie danych scraperem, nakładka niezależna od danych źródłowych, karty edytowane w panelu | [ADR 0004](../adr/0004-obiekt-innowacji.md), [ADR 0006](../adr/0006-panel-administratora.md) |
| Skalowalność | Do 200 innowacji w prompcie, wariant zapasowy z prefiltrem i rerankiem, PostgreSQL | [ADR 0004](../adr/0004-obiekt-innowacji.md) §8, §10 |
| Prywatność | Czat bezstanowy, rozmowy nie są zapisywane, zapis potrzeb bez treści rozmowy, adresów IP nie zapisujemy | [0004](../tasks/0004-zapis-potrzeb.md) |
| Uczciwość odpowiedzi | `why_relevant` tylko z danych bazy, brak wymyślonych kosztów i kontaktów | [DEMO.md](../DEMO.md) |

Koszt jednej rozmowy w złotówkach i miesięczny: nie mamy, do wyliczenia z cennika DeepSeek. Zmierzone zużycie jednej rozmowy: [0002](../tasks/0002-smoke-test.md).

## 20%: dostępność

| Punkt | Stan |
|---|---|
| WCAG 2.1 AA: klawiatura, fokus, `aria-live`, kontrast, powiększenie | axe: 0 naruszeń w 3 motywach na stronach czatu, Zasobnika, panelu, Kreatora i Testera; brak ręcznego testu klawiaturą i czytnikiem ekranu |
| Pasek dostępności (rozmiar tekstu, motyw) | działa, na mobile zwijany ([0010](../tasks/0010-dostepnosc-mobile-i-glos.md)) |
| Wejście głosowe | dyktowanie w czacie i Kreatorze, ukryte bez Web Speech API ([0010](../tasks/0010-dostepnosc-mobile-i-glos.md)) |
| Wersja tekstowa dokumentów | tekst raportu na `/dokument/:id` obok linku do PDF |
| Prosty język, odpowiedzi do klikania | w przepływie czatu ([DEMO.md](../DEMO.md)) |

## 10%: atrakcyjność i pomysłowość UI

Do opisu po stabilnym demo: panel „Twój problem” wypełniany na żywo, odpowiedzi do klikania, karty z uzasadnieniem, trzy motywy.

## 10%: jakość materiałów i MVP

[Scenariusz pokazu](scenariusz-pokazu.md), [README dla jury](README.md), nagranie zapasowe i prezentacja (zakładamy 10 minut): [0011](../tasks/0011-materialy-dla-jury.md).
