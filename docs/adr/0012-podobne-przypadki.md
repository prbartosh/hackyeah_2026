# 0012. „Podobne przypadki” w matchmakingu

- Data: 2026-10-04
- Status: przyjęta

## Kontekst

Moduł I ma pokazywać, jak podobne potrzeby zgłaszali inni. Mamy zapis potrzeb przy wynikach czatu (tabela `potrzeby`, [ADR 0004](0004-obiekt-innowacji.md) §8): same slugi ze słownika, bez treści rozmów i bez danych identyfikujących.

## Decyzja

- **Podobny przypadek:** ma ten sam główny problem co bieżący (pierwszy slug `problemy`) i co najmniej jedną wspólną grupę docelową. Deterministycznie, na slugach, bez embeddingów (spójnie z [ADR 0006](0006-panel-administratora.md)). Bez slugów problemu lub grupy w bieżącym stanie blok się nie pojawia.
- **Prywatność:** pokazujemy tylko liczbę przypadków, nazwę problemu i do 3 najczęściej polecanych innowacji (z liczbą), nigdy treści rozmów. Próg k = 5 (`MIN_CASES`): poniżej tylu przypadków zdarzenie nie jest wysyłane. Bieżący przypadek nie liczy się do własnych (liczymy przed zapisem).
- **Kontrakt:** nowe zdarzenie SSE `similar_cases` po `results`, przed `done`: `{liczba, problem, innowacje: [{slug, nazwa, liczba}]}`. Bez bazy lub przy błędzie odczytu zdarzenia po prostu nie ma, rozmowa nie jest przerywana.
- **Front:** blok „Podobne przypadki” pod wynikami (`ResultsSection`), czyszczony przy każdych nowych wynikach.
- Odczyt: ostatnie 2000 potrzeb, filtrowanie w Pythonie (kolumny to `text[]` albo JSON w testach).

## Konsekwencje

- Na świeżej bazie blok długo się nie pokaże (potrzeba 5 podobnych przypadków). Na demo trzeba zasiać potrzeby albo zrobić kilka rozmów.
- Dopasowanie po slugach zależy od jakości `update_problem` w czacie.
