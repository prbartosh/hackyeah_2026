# 0005. Słownik i nakładka innowacji

- Status: w toku (czeka na przegląd)
- Osoba: Bartłomiej (backend)

## Cel

Typowane listy dla 115 innowacji, zgodnie z [ADR 0004](../adr/0004-obiekt-innowacji.md) §3–§6. Po tym zadaniu katalog w prompcie zawiera listy, a stan problemu i zapis potrzeb ([zadanie 0004](0004-zapis-potrzeb.md)) mają slugi. Backend już wczytuje nakładkę (`InnovationRepository`, plik `wzbogacenia.json`), brakuje danych.

## Kroki

- [x] `assets/innowacje-spoleczne/slownik.json`: sekcje `grupy_docelowe`, `problemy`, `miejsca`, `skale`, `typy_rozwiazan`, `role`, `wymagane_zasoby`; wartości ze slugiem, etykietą i aliasami. Źródło: 9 kategorii ROPS i pola `grupa_docelowa`, `problem`, `kto_moze_skorzystac` wszystkich innowacji
- [ ] Zatwierdzenie słownika przez człowieka (słownik ułożony ręcznie z pól wszystkich 115 innowacji)
- [x] Skrypt (`backend/scripts/tag_innovations.py`), który dla każdej innowacji prosi model o propozycję list ze słownika, z `dowody` i `nowe_wartosci` (ADR 0004 §6). Wynik do pliku roboczego (`.cache/propozycje.json`), `--apply` przenosi go do nakładki. Na przyszłe odświeżenia scrapera
- [x] Zapis do `assets/innowacje-spoleczne/wzbogacenia.json` z `zatwierdzone: true`: 115 rekordów otagowanych ręcznie (bez skryptu)
- [ ] Wyrywkowy przegląd nakładki (ok. 20 rekordów)
- [x] Walidacja przy wczytaniu: slugi w słowniku, limity list, brak duplikatów (ADR 0004 §6 pkt 7). Błędne wartości są logowane i pomijane, a test `test_real_overlay_is_clean` pilnuje plików w repo
- [x] `update_problem` w czacie wypełnia `slugi` ze słownika (słownik w system prompcie, slugi spoza sekcji odpadają)

## Notatki

- Pole panelu -> sekcja słownika: `zasoby` -> `wymagane_zasoby`, `proby` -> `typy_rozwiazan`, pozostałe 1:1 (`PROBLEM_SECTIONS` w `prompts.py`).
- Wartości użyte tylko raz albo wcale (`przemoc`, `osoby-doswiadczajace-przemocy`, `wzor-dokumentu`, `powiat`, `region`, `wymagane_zasoby`) zostają, bo są potrzebne w scenariuszach (ADR 0004 §5).

- `wdrozenie` zostaje `null`, dopóki ktoś nie uzupełni go ze źródeł. Nie zgadujemy.
- Odświeżenie scrapera może dodać lub usunąć innowacje. Nakładka bez pasującego `slug` jest pomijana przy wczytaniu.
