# 0004. Zapis potrzeb

- Status: todo
- Osoba: Bartłomiej (backend)
- PR:

## Cel

Przy każdej odpowiedzi z wynikami (`show_results`) backend zapisuje potrzebę w tabeli `potrzeby` ([ADR 0004](../adr/0004-obiekt-innowacji.md) §8). Zapis jest podstawą trendów dla administratora (moduł II) i „podobnych przypadków” (moduł I, projekt w osobnym ADR). Bez tekstu rozmowy i podsumowania. To jedyny zapis po stronie backendu ([ADR 0005](../adr/0005-matchmaking-chat-llm.md)).

## Kroki

- [ ] Model `Potrzeba`: `id`, `rola`, slugi per pole stanu (`grupy_docelowe`, `problemy`, `miejsca`, `skale`, `zasoby`, `proby`) jako `text[]`, `innowacje` (slugi pokazanych wyników, `text[]`), `brak_dopasowania` (bool), `created_at`; migracja Alembic
- [ ] `PotrzebaRepository.add()`
- [ ] W `ChatService._tool_show_results`: zapis przez repozytorium przy każdym wywołaniu (sesja DB wstrzyknięta jak w `items`)
- [ ] Błąd zapisu nie może przerwać strumienia: logujemy i idziemy dalej
- [ ] Testy

## Notatki

- Retencja: zapisy trzymamy do końca demo/hackathonu, potem kasujemy.
- Trendy (panel admina) są poza demo. Później widok dla roli ROPS z logowaniem.
- Backend jest bezstanowy i nie zna identyfikatora rozmowy. Jeśli użytkownik poprosi o wyniki drugi raz w tej samej rozmowie, powstaną dwa rekordy. Na demo akceptowalne, przy trendach liczymy to jako szum.
- Slugi w stanie pojawią się po [zadaniu 0005](0005-slownik-i-nakladka.md). Wcześniej zapis ma rolę, pokazane innowacje, flagę i datę.
