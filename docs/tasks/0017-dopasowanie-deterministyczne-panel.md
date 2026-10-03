# 0017. Deterministyczne dopasowanie w panelu zamiast embeddingów

- Status: todo
- Osoba: Kacper (do potwierdzenia)
- PR:

## Cel

Panel administratora wybiera karty-kandydatów do szkicu odpowiedzi, wykrywa duplikaty i grupuje zgłoszenia w radarze bez API embeddingów (DeepSeek go nie ma, [ADR 0007](../adr/0007-deepseek.md)). Wynik jest powtarzalny, a przy kandydacie i grupie widać, dlaczego pasuje.

## Kroki

- [ ] Decyzje (pytania niżej) i dopisanie ich do ADR 0006
- [ ] Moduł `services/matching.py` z czystymi funkcjami: `tag_text` (tagi ze słownika po etykietach i aliasach całymi frazami), `card_score` (wynik i powody), `similar_text` (trigram)
- [ ] Kandydaci kart: ważone pokrycie tagów zgłoszenia przez nakładkę karty (problemy 3, grupy docelowe 2, miejsca i typy rozwiązań 1), remis rozstrzyga trigram
- [ ] Duplikaty: trigram po treści, liczony w locie
- [ ] Radar: niedopasowane zgłoszenia grupowane po wspólnym tagu `problemy`; zgłoszenia bez tagów idą do grupowania trigramem (potrzeby spoza słownika)
- [ ] Usunięcie pozostałości embeddingów: `AIGateway.embed` i `embedding_model`, podział progów „openai/local” w `app_settings.py`, `CardService.reindex` i `similar`, endpoint `/reindeksuj`, pola `ma_embedding` i `model_embeddingow` (backend i frontend), fake `embed` w testach
- [ ] Testy jednostkowe `matching.py` bez bazy i bez AI, na tekstach z seeda
- [ ] Dokumentacja: ADR 0006 (sekcja Embeddingi), [panel-administratora.md](../panel-administratora.md)

## Pytania do decyzji

1. Kolumny `embedding` i `embedding_model`: usuwamy migracją 0003 czy na razie zostawiamy nieużywane (bez migracji przed demo)?
2. Czy dodajemy pole `tagi` (slugi ze słownika, walidowane jak `uzyte_karty`) do odpowiedzi triażu DeepSeek?
3. Radar: grupujemy po samym problemie czy po parze problem i grupa docelowa?
4. Karty bez nakładki (dodane w panelu albo z dokumentu): wystarczy trigram, czy przy zapisie wymagamy uzupełnienia tagów?
5. Czy pokazujemy w UI „dlaczego pasuje” (etykiety przy kandydacie i przy grupie)?

## Notatki

- Dziś (po PR #24) wektory są zawsze lokalne (`local-trigram-v1`). Działa to bez API i deterministycznie, ale słabo wybiera kandydatów kart, bo zgłoszenie i karta są napisane innym językiem.
- Prototyp dopasowania aliasów na 9 tekstach z seeda: 6 trafnych tagów, 3 fałszywe (np. „wypalenie” dostało `brak-pracy`). Dlatego dopasowanie całymi frazami, obcinanie końcówek tylko dla słów od 6 liter, a precyzję daje LLM w triażu.
- „Wypalenie” nie ma w słowniku, więc takie zgłoszenie trafi do radaru. Tak ma być.
- Rozważone i odrzucone: BM25/TF-IDF (słabsza odmiana polska, trudniej wytłumaczyć wynik) i same trigramy (najmniejszy diff, ale słabi kandydaci).
