# 0049. Jev w moderacji i tagowaniu zgłoszeń

- Status: todo
- Osoba: Wiktor
- PR: 

## Cel

Triaż zgłoszenia oznacza dane osobowe, spam i pilność oraz proponuje kategorię i główny problem ze słownika. Pracownik widzi flagi i decyduje; nic nie dzieje się automatycznie ([ADR 0016](../adr/0016-jev-oceny-trafnosci.md)).

## Kroki

- [ ] PESEL wykrywany w kodzie (wzorzec i suma kontrolna) i maskowany przed wysłaniem tekstu do Jeva i DeepSeek
- [ ] Jedno zapytanie Jeva na zgłoszenie: Choice kategoria i główny problem (dwie kolejności opcji, średnia), Noul dane osobowe, spam (3 Noule), Score pilność
- [ ] Ustalić z zespołem, co wygrywa przy działającym DeepSeek (kategoria, pilność, tagi)
- [ ] Zestaw przykładów (dane osobowe, spam, pilne) i pomiar: trafność kategorii i problemu, czułość flag, fałszywe alarmy na zestawie testowym
- [ ] Testy z fałszywym portem

## Notatki
