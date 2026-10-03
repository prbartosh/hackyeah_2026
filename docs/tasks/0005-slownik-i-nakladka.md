# 0005. Słownik i nakładka innowacji

- Status: todo
- Osoba: Bartłomiej (backend)

## Cel

Typowane listy dla 115 innowacji, zgodnie z [ADR 0004](../adr/0004-obiekt-innowacji.md) §3–§6. Po tym zadaniu katalog w prompcie zawiera listy, a stan problemu i zapis potrzeb ([zadanie 0004](0004-zapis-potrzeb.md)) mają slugi. Backend już wczytuje nakładkę (`InnovationRepository`, plik `wzbogacenia.json`), brakuje danych.

## Kroki

- [ ] `assets/innowacje-spoleczne/slownik.json`: sekcje `grupy_docelowe`, `problemy`, `miejsca`, `skale`, `typy_rozwiazan`, `role`, `wymagane_zasoby`; wartości ze slugiem, etykietą i aliasami. Źródło: 9 kategorii ROPS i pola `grupa_docelowa`, `problem`, `kto_moze_skorzystac` wszystkich innowacji
- [ ] Zatwierdzenie słownika przez człowieka
- [ ] Skrypt (w `backend/scripts/`), który dla każdej innowacji prosi model o propozycję list ze słownika, z `dowody` i `nowe_wartosci` (ADR 0004 §6). Wynik do pliku roboczego, nie od razu do nakładki
- [ ] Przegląd propozycji i zapis do `assets/innowacje-spoleczne/wzbogacenia.json` z `zatwierdzone: true`
- [ ] Walidacja przy wczytaniu: slugi w słowniku, limity list, brak duplikatów (ADR 0004 §6 pkt 7)
- [ ] `update_problem` w czacie wypełnia `slugi` ze słownika

## Notatki

- `wdrozenie` zostaje `null`, dopóki ktoś nie uzupełni go ze źródeł. Nie zgadujemy.
- Odświeżenie scrapera może dodać lub usunąć innowacje. Nakładka bez pasującego `slug` jest pomijana przy wczytaniu.
