# 0008. Kreator pomysłów (moduł III)

- Data: 2026-10-03
- Status: przyjęta

## Kontekst

Użytkownicy zgłaszają pomysły oddolnie, a część z nich szuka finansowania. Potrzebujemy fiszki pomysłu, generatora wniosku (w czasie naboru), canvy i asystenta. Panel administratora ([ADR 0006](0006-panel-administratora.md)) ma już zgłoszenia, wątki, powiadomienia i triaż, więc Kreator ma się do niego dopiąć, a nie tworzyć własną skrzynkę.

## Decyzja

- **Wysłana fiszka i wniosek to zwykłe zgłoszenie (`Ticket`)** z prefiksem „[Pomysł z Kreatora]” lub „[Wniosek z Kreatora]” w treści. Admin dostaje powiadomienie, triaż, wątek i odpowiedź bez zmian w panelu. Model `Ticket` bez zmian.
- **Brak kont, dostęp tokenem.** Fiszka, wniosek i canva mają sekretny token (`secrets.token_urlsafe(24)`) w adresie, jak wątek zgłoszenia. Nie ma endpointów listujących. Lista „Twoje szkice” to skrót w `localStorage` przeglądarki.
- **Nabory i szablony canv to dane** (tabele `nabory`, `szablony_canvy`). Pola wniosku mają limit znaków, wskazówkę i listę `zrodla`: pól fiszki, z których wolno je wypełnić. Pole bez źródeł (budżet, wskaźniki) zawsze zostaje „do uzupełnienia”. Szablon canvy ładowany z `backend/app/data/canva_*.json` przy starcie (dopisuje brakujące).
- **Widoczność generatora według dat** (`termin_od <= dziś <= termin_do`, włącznie). Tworzenie i wysyłka wniosku poza naborem zwracają 409 z komunikatem po polsku. Odczyt i eksport istniejącego szkicu działają zawsze.
- **AI nic nie dopowiada.** Wypełnianie fiszki: wartości spoza słowników (etap, obszar) są odrzucane. Szkic wniosku: model dostaje tylko dane fiszki i pola wniosku, których fiszka dotyczy. Tekst z liczbą spoza fiszki jest zastępowany tekstem złożonym wprost z danych fiszki. Brak klucza, limit lub awaria: ten sam tekst z fiszki bez AI i komunikat po polsku.
- **Osobny limit kosztów AI** dla publicznych wywołań: `KREATOR_AI_DAILY_CALL_LIMIT` (domyślnie 100), licznik `kreator:RRRR-MM-DD` w `uzycie_ai` (kolumna `dzien` poszerzona do 32 znaków, migracja `0003`).
- **Podobne innowacje** z tych samych lokalnych embeddingów co triaż ([ADR 0007](0007-deepseek.md)), próg `prog_dopasowania` z ustawień panelu, każdy wynik ze źródłem.
- **Dopasowanie naboru** („Znajdź finansowanie”) po obszarze i słowach kluczowych odbiorcy, z uzasadnieniem w jednym zdaniu.
- **Błędy biznesowe** to `KreatorError` (status + komunikat po polsku), jeden handler w `main.py`.

## Konsekwencje

- Utrata linku = utrata dostępu do szkicu. Brak rate limitu na publicznych endpointach poza dziennym limitem AI.
- Treść zgłoszenia ze wniosku nie przechodzi walidacji długości formularza `/zglos` (wniosek bywa dłuższy).
- Dopasowanie naborów to proste porównanie tekstu: przewidywalne, ale zależne od słów kluczowych wpisanych w naborze.
- Szablon canvy odtworzony z PDF (tekst z PDF ma zepsute polskie znaki), do sprawdzenia z oryginałem.

2026-10-04: dzienny limit wywołań AI usunięty (decyzja Nikodema).
