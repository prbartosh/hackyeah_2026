# 0051. Jev w czacie: weryfikacja wyników

- Status: todo
- Osoba: Wiktor
- PR: 

## Cel

Przed pokazaniem wyników czatu Jev sprawdza karty wybrane przez DeepSeek: kolejność, odrzucenie słabych, uczciwe „brak dobrego dopasowania”. Nie dodaje kart ([ADR 0016](../adr/0016-jev-oceny-trafnosci.md)).

## Kroki

- [ ] Diagnoza „22× `show_results` bez `items`” (brak klucza `items` czy pusta lista)
- [ ] Weryfikacja w `_tool_show_results` (Noul „rozwiązuje”, Noul „grupa”), progi z pomiaru
- [ ] Pomiar `eval_matchmaking.py` z Jevem i bez: top 1, top 3, brak dopasowania 8/8, ile razy Jev usunął oczekiwaną kartę
- [ ] Testy z fałszywym portem

## Notatki
