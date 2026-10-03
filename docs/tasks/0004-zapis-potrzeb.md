# 0004. Zapis potrzeb bez dopasowania

- Status: todo
- Osoba: 

## Cel

Gdy matchmaking nie znajdzie dobrego dopasowania (`no_good_match`), backend zapisuje potrzebę w tabeli `potrzeby` ([ADR 0004](../adr/0004-obiekt-innowacji.md) §8): same slugi ze stanu problemu, rola i data, bez tekstu rozmowy i podsumowania. To jedyny zapis po stronie backendu ([ADR 0005](../adr/0005-matchmaking-chat-llm.md)).

## Kroki

- [ ] Model `Potrzeba` (id, `rola`, slugi per pole stanu jako `text[]`, `created_at`) i migracja Alembic
- [ ] `PotrzebaRepository.add()`
- [ ] W `ChatService._tool_show_results`: przy `no_good_match` zapis przez repozytorium (sesja DB wstrzyknięta jak w `items`)
- [ ] Błąd zapisu nie może przerwać strumienia: logujemy i idziemy dalej
- [ ] Testy

## Notatki

- Ma sens dopiero, gdy stan ma slugi, czyli po `slownik.json` (ADR 0004 §5). Wcześniej zapis zawiera tylko rolę i datę.
