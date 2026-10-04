# 0050. Jev w panelu: dopasowanie, duplikaty, radar

- Status: todo
- Osoba: Wiktor
- PR: 

## Cel

Lepsza kolejność kart przy zgłoszeniu i pewniejsze duplikaty („te dwa zgłoszenia opisują ten sam problem”), bez utraty znanego powodu dopasowania ([ADR 0006](../adr/0006-panel-administratora.md), [ADR 0016](../adr/0016-jev-oceny-trafnosci.md)).

## Kroki

- [ ] Decyzja zespołu: Jev tylko zmienia kolejność kandydatów z `matching.py`, wynik deterministyczny, `powody` i progi radaru zostają
- [ ] Ocena Jeva jako osobne pole w `proponowane_karty`
- [ ] Duplikaty: kandydaci z trigramów (niższy próg), jedno zapytanie z Noulem na kandydata
- [ ] Radar: łączenie grup bez tagu po Noulu „ten sam problem” (opcjonalnie)
- [ ] Pomiar: top 1 i top 3 kart, precyzja i czułość duplikatów na parach z zestawu (29-36 i oryginały)

## Notatki
