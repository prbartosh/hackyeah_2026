# 0016. Jev (TypeSafe System One) do ocen trafności

- Data: 2026-10-04
- Status: przyjęta

## Kontekst

Dopasowanie kart (`matching.py`, tagi i TF-IDF) dobrze wybiera kandydatów, ale słabo ocenia, czy karta naprawdę odpowiada na problem: w kreatorze „Takie rozwiązania już działają” pokazywało karty dla potrzeb spoza bazy, jeśli miały wspólne słowa (dzieci, OPS). Ocena przez DeepSeek (generowanie tekstu) jest wolna i niestabilna przy porównywaniu wielu par. Jev zwraca typowane oceny (Noul: prawdopodobieństwo „tak”, Score: pozycja na skali, Choice: wybór opcji) w ok. 0,3 s za cenę 0,042 $ za milion tokenów wejścia ([dokumentacja](https://docs.typesafe.ai)).

## Decyzja

- **Port `Judge`** (`services/jev.py`): `evaluate(state, questions) -> Answers` z neutralnymi typami `Noul`, `Score`, `Choice`. Adapter `TypeSafeJudge` na `httpx` (bez nowej zależności) zna format `POST /v1/systemone`, ponawia przy 429 i 529, mapuje błędy na `JudgeError` i waliduje odpowiedzi (opcja ze zbioru, liczby 0-1). Serwisy nie znają formatu API (jak [ADR 0010](0010-port-llm.md)).
- **Łagodna degradacja:** bez `TYPESAFE_API_KEY`, przy błędzie lub po `JEV_TIMEOUT_SECONDS` (4 s) system działa jak przed zmianą. W logach brak treści zapytań.
- **Jev to podpowiedź, nie uprawnienie:** treść użytkownika w `state` może sterować oceną, więc Jev tylko sortuje i zawęża kandydatów wybranych przez kod. Nie dodaje kart, niczego nie publikuje ani nie wysyła. Wagi, progi i arytmetyka są w kodzie.
- **Kreator** (`services/relevance.py`, zadanie 0048): `matching.py` wybiera 8 kandydatów, Jev ocenia każdą parę opis-karta jednym zapytaniem z trzema pytaniami (Score trafności w 5 poziomach, Noul „rozwiązuje główny problem”, Noul „ta sama grupa”), pary równolegle. Wynik `0,5 · trafność + 0,3 · rozwiązuje + 0,2 · grupa`, próg 0,32. Powody: etykiety wspólnych tagów jak dotąd i, od 0,8, „odpowiada na ten sam problem” oraz „ta sama grupa odbiorców”. Oceny par w pamięci procesu (LRU), bo front odświeża listę przy pisaniu.
- **Pomiar** (`scripts/eval_kreator.py`, zestaw rozszerzony o 7 potrzeb spoza bazy, nr 37-43): bez Jeva top 1 28/35, top 3 32/35, spoza bazy nic nie pokazuje 5/8; z Jevem (jev-1.13.0) top 1 29/35, top 3 34/35, spoza bazy 8/8. Najlepszy kandydat spoza bazy dostaje do 0,27, najsłabsza oczekiwana karta 0,37. Instrukcje po angielsku (top 3 33/35) i 12 kandydatów zamiast 8 (bez zmian) nie poprawiły wyniku. Pełny przebieg: 344 zapytania, ok. 0,02 $, p50 0,31 s i p95 0,40 s na zgłoszenie.
- **Model:** `TYPESAFE_MODEL=jev-latest` (decyzja Wiktora). Próg dobrany na jev-1.13.0; po zmianie wersji powtórzyć pomiar.
- Dalsze miejsca w osobnych zadaniach: moderacja i tagi (0049), panel i radar (0050, dotyka [ADR 0006](0006-panel-administratora.md)), czat (0051).

## Konsekwencje

- Mniej fałszywych podpowiedzi w kreatorze, lepsza kolejność; przypadek bez polskich znaków (#33) dalej przepada, bo TF-IDF nie wybiera właściwej karty do kandydatów.
- Opis pomysłu z kreatora trafia do nowego zewnętrznego dostawcy (informacja w interfejsie kreatora).
- Wynik zależy od modelu zewnętrznego: ten sam opis nie musi dawać tego samego wyniku po zmianie wersji Jeva. Bez klucza zachowanie jest deterministyczne jak w ADR 0006.
- Próg dobrany na 43 przypadkach; mało danych, możliwe dopasowanie pod zestaw.
