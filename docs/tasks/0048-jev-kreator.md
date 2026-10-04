# 0048. Jev w kreatorze: „Takie rozwiązania już działają”

- Status: w toku
- Osoba: Wiktor
- PR: 

## Cel

Kreator pokazuje trafniejsze istniejące innowacje, a dla pomysłów spoza bazy nic. Jev ([ADR 0016](../adr/0016-jev-oceny-trafnosci.md)) ocenia kandydatów z `matching.py`; bez klucza lub przy awarii działa jak dotąd.

## Kroki

- [x] Port `Judge` i adapter HTTP (`services/jev.py`), ustawienia `TYPESAFE_*`, `.env.example`
- [x] Czysta funkcja `rank_cards` wydzielona z `CardService.rank`
- [x] Reranking w kreatorze (`services/relevance.py`, `FiszkaService.similar_to_text`)
- [x] Zestaw testowy: 7 potrzeb spoza bazy (37-43)
- [x] Skrypt `scripts/eval_kreator.py` (bez Jeva lokalnie, z Jevem ręcznie)
- [x] Pomiar i dobór progu: top 1 28 → 29/35, top 3 32 → 34/35, spoza bazy 5/8 → 8/8
- [x] Testy z fałszywym portem i transportem HTTP (`test_jev.py`, `test_relevance.py`)
- [x] Informacja o zewnętrznym modelu AI w kreatorze
- [ ] Sprawdzenie na `docker compose up --build` z kluczem

## Notatki

- Instrukcje po angielsku i 12 kandydatów nie poprawiły wyniku, zostają polskie i 8.
- #33 („tata ma kupe lekow…”) przepada przed Jevem: TF-IDF nie daje właściwej karty do kandydatów.
- Oceny Jeva z ewaluacji w `backend/.cache/` (poza repo); przegląd progów: `--jev --sweep` bez nowych zapytań.
