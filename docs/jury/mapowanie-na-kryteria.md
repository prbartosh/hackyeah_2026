# Mapowanie pokazu na kryteria oceny

Kryteria: [kryteria-oceny.md](../kryteria-oceny.md). Stan: [status.md](../status.md). Do „zrobione” trafia tylko to, co działa na demo. Brak jeszcze testu z czytnikiem ekranu.

## 40%: spełnienie wyzwania

| Moduł | Co pokazujemy | Opis |
|---|---|---|
| I Matchmaking (obligatoryjny, 10%) | Czat: rola, max 4 rundy pytań, panel „Twój problem”, do 5 innowacji z `why_relevant`, dane gminy, podobne przypadki | [DEMO.md](../DEMO.md), [ADR 0005](../adr/0005-matchmaking-chat-llm.md), [ADR 0012](../adr/0012-podobne-przypadki.md) |
| II Zasobnik wiedzy (+5%) | `/zasobnik`: 115 innowacji, raporty, publikacje, Mapa Wyzwań, wskaźniki; `/dokument/:id` z wersją tekstową | [baza-innowacji.md](../baza-innowacji.md) |
| III Kreator pomysłów | `/kreator`: fiszka z AI, nabory i wniosek (DOCX), „Znajdź finansowanie”, canvy, asystent | [kreator-pomyslow.md](../kreator-pomyslow.md), [ADR 0008](../adr/0008-kreator-pomyslow.md) |
| IV Tester innowacji | Oceny i zgłoszenia do testów na stronie innowacji, poziom dowodu, moderacja | [ADR 0011](../adr/0011-tester-innowacji.md) |
| V Platforma komunikacji | Hub `/wspolpraca`, `/zglos` i wątek `/watek/:token`, pytania `/pytania`, mentorzy `/mentorzy`, giełda partnerstw `/partnerstwa` z rozmowami `/rozmowa/:token` | [ADR 0013](../adr/0013-gielda-partnerstw.md), [0014](../adr/0014-mentorzy.md), [0015](../adr/0015-pytania-do-rops.md) |
| VI Panel administratora | `/admin`: skrzynka z triażem, powiadomienia, import dokumentu → karta, karty, radar, nabory, opinie | [panel-administratora.md](../panel-administratora.md), [ADR 0006](../adr/0006-panel-administratora.md) |
| VII Middleman innowacji (+5%) | „Dostosuj do mojej instytucji” → `/innowacja/:slug/wdrozenie`: karta wdrożenia, druk, „Chcę to wdrożyć” | [ADR 0009](../adr/0009-middleman-karta-uslugi.md) |

Jakość działania: skrypt `backend/scripts/eval_matchmaking.py` na [zestawie testowym](../zestaw-testowy.md). Pełnego pomiaru nie robiliśmy, liczb nie wpisujemy.

Poza zakresem: PJM i audio.

## 20%: potencjał wdrożeniowy

| Punkt | Argument | Źródło |
|---|---|---|
| Koszt | Jeden model, katalog w prompcie (cache), limity zapytań w nginx | [ADR 0005](../adr/0005-matchmaking-chat-llm.md), [ADR 0010](../adr/0010-port-llm.md) |
| Utrzymanie | Dane odświeża scraper, nakładka jest niezależna od danych źródłowych, karty edytuje panel | [ADR 0004](../adr/0004-obiekt-innowacji.md), [ADR 0006](../adr/0006-panel-administratora.md) |
| Skalowalność | Do 200 innowacji w prompcie, wariant zapasowy z prefiltrem i rerankiem, PostgreSQL | [ADR 0004](../adr/0004-obiekt-innowacji.md) |
| Dostawca modelu | Port `LLMProvider`, wymiana przez `.env` | [ADR 0010](../adr/0010-port-llm.md) |
| Prywatność | Czat bezstanowy, potrzeby bez treści rozmowy, adresów IP nie zapisujemy | [README dla jury](README.md) |
| Uczciwość odpowiedzi | `why_relevant` tylko z danych bazy, bez wymyślonych kosztów i kontaktów | [DEMO.md](../DEMO.md) |

Kosztu rozmowy w złotówkach nie mamy. Do wyliczenia z cennika dostawcy.

## 20%: dostępność

| Punkt | Stan |
|---|---|
| WCAG 2.1 AA | axe: 0 naruszeń w 3 motywach na stronach czatu, Zasobnika, panelu, Kreatora i Testera; brak ręcznego testu klawiaturą i czytnikiem |
| Pasek dostępności | rozmiar tekstu, 3 motywy, zwijany na mobile |
| Wejście głosowe | dyktowanie w czacie i Kreatorze, ukryte bez Web Speech API |
| Czytanie na głos, prosty język | przy kartach i odpowiedziach czatu |
| Deklaracja dostępności | `/dostepnosc` |
| Wersja tekstowa dokumentów | tekst raportu na `/dokument/:id` obok linku do PDF |

## 10%: atrakcyjność UI

Do opisu po stabilnym demo: panel „Twój problem” na żywo, odpowiedzi do klikania, karty z uzasadnieniem, trzy motywy.

## 10%: jakość materiałów i MVP

[Scenariusz pokazu](scenariusz-pokazu.md), [README dla jury](README.md), nagranie zapasowe i prezentacja (10 minut).
