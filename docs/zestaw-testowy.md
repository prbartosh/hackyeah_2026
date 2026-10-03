# Zestaw testowy dopasowania

Szkic: zgłoszenia napisane jak przez użytkownika, z rolą i oczekiwanym `slug` wyniku głównego. Służy do sprawdzania jakości dopasowania (matchmaking w czacie). Osoby i sytuacje są wymyślone. Scenariusze 1–3 pochodzą z [user_scenario.md](../user_scenario.md), 4 to scenariusz „wójt” z [DEMO.md](DEMO.md).

Role: `mieszkaniec`, `cus-ops`, `partner` ([ADR 0004](adr/0004-obiekt-innowacji.md) §3). Status: zatwierdzony przez Nikodema i Wiktora jako zestaw startowy, korekty w razie potrzeby.

| # | Rola | Zgłoszenie | Oczekiwany `slug` | Uwagi |
|---|---|---|---|---|
| 1 | mieszkaniec | Mama ma początki demencji i dzwoni do mnie po 10 razy dziennie, bo nie pamięta, czy brała leki i gdzie są klucze. Nie mogę być przy niej cały dzień, a do DPS-u nie chce iść. Szukam czegoś prostego, co jej pomoże w domu. | `kody-qr-na-pomoc-seniorom` | z user_scenario.md; uzupełniające: `bawita`, `terapeuta-przestrzeni` |
| 2 | mieszkaniec | Jestem Głuchy i muszę złożyć wniosek o tłumacza PJM na studiach. Formularz jest napisany trudnym językiem urzędowym, nie wiem, co wpisać. | `dostepny-wniosek-dla-ggluchych` | z user_scenario.md; uzupełniające: `glucha-ankieta`, `wielodziedzinowy-slownik-terminow-specjalistycznych-pl-pjm` |
| 3 | mieszkaniec | W markecie nie mogę zrobić zakupów, bo syn nie mieści się w koszyku, a nie mam jak go prowadzić i pchać wózka. Chcę zrobić zakupy razem z nim. | `zakupy-na-jednym-wozku-z-dzieckiem-z-niepelnosprawnoscia-ruchowa` | z user_scenario.md; uzupełniające: `zakupy-bez-barier` |
| 4 | partner | Jestem wójtem małej gminy. Mamy dużo samotnych seniorów, zimą zamykają się w domach. Budżet jest mały, mamy KGW i OPS. Co możemy wdrożyć? | `mobilne-centrum-pomocy-dla-osob-starszych` | scenariusz „wójt” z DEMO.md; sprawdzić też `wirtualne-izby-pamieci`, `senior-cuder`, `centrum-antydepresyjne`; przed pokazem sprawdzić, który wynik jest pierwszy |
| 5 | partner | W naszej gminie wiejskiej mieszka kilka osób w kryzysie bezdomności. Nie mamy schroniska i szukamy długofalowego programu na wsi, który wyprowadzi ich z bezdomności, a nie tylko doraźnej pomocy. | `wiejski-program-pomocy-osobom-w-kryzysie-bezdomnosci-sciezka-feniksa` | |
| 6 | partner | Jako gmina chcemy aktywizować zawodowo kobiety ze wsi. Dojazd do urzędu pracy to dla nich problem. | `mobilna-gielda-pracy` | |
| 7 | cus-ops | Pracuję w OPS na wsi. Osoby doświadczające przemocy nie przychodzą do nas, a do specjalisty jest daleko. Jak do nich dotrzeć? | `mobilna-pomoc-terapeutyczna` | |
| 8 | cus-ops | Mam podopiecznych, którzy mieszkają w lokalach bez łazienki. Potrzebuję rozwiązania, które da im prywatną łazienkę bez remontu. | `przenosne-modularne-lazienki` | |
| 9 | cus-ops | Osoby w kryzysie bezdomności u nas nie mają gdzie się umyć, co pogarsza ich zdrowie i izoluje od innych. Szukam prostego rozwiązania dla gminy, które pozwoli im się umyć. | `szlakiem-ludzi-bezdomnych` | |
| 10 | partner | Nasza organizacja pomaga uchodźcom z Afganistanu. Mamy problem z komunikacją, bo nie znają polskiego i nie rozumieją tutejszych zasad. | `dialog-ponad-kulturami-1` | niejednoznaczne: `wortal-informacyjny` też pasuje |
| 11 | partner | Jestem nauczycielem. W klasie mam ukraińskie dzieci, które nie radzą sobie w nowej szkole i nie mają kontaktu z rówieśnikami. | `moj-pomocny-virtual-world` | |
| 12 | mieszkaniec | Jestem niewidomy i chcę sam poruszać się po mieście. Szukam czegoś, co poprowadzi mnie głosem. | `ngoz-nawigacja-glosowa-osob-zaleznych` | |
| 13 | mieszkaniec | Opiekuję się tatą, który bierze kilkanaście leków. Boję się, że coś pomyli, kiedy mnie nie ma. | `inteligentny-organizer-do-lekow` | |
| 14 | mieszkaniec | Moja babcia nie radzi sobie z telefonem i internetem, przez to czuje się wykluczona i nie załatwia spraw sama. | `merkury` | |
| 15 | mieszkaniec | Zmarł mój mąż i nie wiem, jak uregulować sprawy spadkowe. Jestem starszą osobą, nie stać mnie na prawnika. | `stworzenie-narzedzia-ulatwiajacego-seniorom-prawidlowe-regulowanie-spraw-spadkowych` | |
| 16 | mieszkaniec | Mój syn ma autyzm i prawie nie mówi. Szukam sposobu, żeby nauczyć go komunikować się bez słów. | `jezykolamacz` | |
| 17 | mieszkaniec | Moja mama ma 75 lat i ostatnio dwa razy upadła w domu. Chcę ograniczyć ryzyko kolejnych upadków. | `obu-obuwie-po-domu` | |
| 18 | cus-ops | Pracuję w DPS. Mamy mieszkańców z chorobami otępiennymi i brakuje nam narzędzi do pracy ze wspomnieniami. | `korytarz-wspomnien` | |
| 19 | mieszkaniec | Jestem obcokrajowcem w Polsce i nie wiem, jak korzystać z publicznej opieki zdrowotnej, nie znam polskiego. | `health-guide-pl` | |
| 20 | partner | Prowadzę fundację. Chcemy zorganizować żeglowanie dla osób niewidomych, ale brakuje sprzętu do nawigacji. | `blue-sea-eye` | |
| 21 | mieszkaniec | Jestem osobą głuchą i w hotelu boję się, że nie usłyszę alarmu pożarowego ani pukania do drzwi. | `straznik` | |
| 22 | cus-ops | Opiekujemy się seniorami leżącymi, a zwykła terapia zajęciowa jest dla nich niedostępna. Szukam zestawu do pracy przy łóżku. | `therapy-set` | |
| 23 | mieszkaniec | Jestem słabowidzący i marzę o wyjściu w góry. Czy da się to zorganizować bezpiecznie? | `turystyka-gorskawspinaczka-dostepna-dla-wszystkich` | niejednoznaczne: `zdobadz-swoje-szczyty` też pasuje |
| 24 | cus-ops | Prowadzimy dzienny dom pomocy. Seniorzy nie umieją przygotować zdrowych posiłków i jedzą byle co. | `talerze-zdrowia` | |
| 25 | cus-ops | W rodzinie nagle pojawiła się osoba zależna i rodzina jest zdezorientowana, nie wiadomo, od czego zacząć opiekę w domu. | `organizator-kompleksowej-opieki-w-miejscu-zamieszkania` | |
| 26 | partner | Organizujemy koncerty i wiemy, że osoby głuche są z nich wykluczone. Jak sprawić, żeby mogły odczuć muzykę? | `wibraap` | niejednoznaczne: `straznik` też może się pojawić |
| 27 | mieszkaniec | Właśnie dowiedziałem się, że mam raka. Jestem przerażony i nie wiem, gdzie szukać wsparcia na początku leczenia. | `oncotriada` | |
| 28 | partner | Chcę założyć firmę produkującą drony rolnicze i szukam pomysłu na biznes. | brak (`brak_dopasowania`) | test uczciwego „brak dopasowania” |

## Kandydaci na pokaz

Wybór z danych, przed pomiarem z [0009](tasks/0009-ewaluacja-dopasowania.md). Po pomiarze zostają tylko te, które trafiają na 1. miejscu.

- **Mieszkaniec:** #1 (mama z demencją). Rezerwa: #2, #3, #17.
- **CUS/OPS:** #7 (przemoc, dotarcie na wsi). Rezerwa: #8.
- **Partner:** #4 (wójt, samotni seniorzy), bo to scenariusz z DEMO.md. Rezerwa: #6.
- **Brak dopasowania:** #28.

Najpewniejsze do testu (jedna oczywista innowacja): #1, #2, #3, #6, #7, #8, #17, #21. Z konkurencją: #4, #5, #9, #10, #23, #26.

## Sposób użycia

- Oczekiwany `slug` ma się znaleźć wśród wyników, najlepiej jako pierwszy. Pozycje z uwagą „niejednoznaczne” mogą zająć drugie miejsce.
- Wyniki zapisywać po każdej zmianie promptu lub nakładki: ile razy `slug` był pierwszy, ile w pierwszej piątce.
