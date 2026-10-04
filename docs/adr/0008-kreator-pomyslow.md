# 0008. Kreator pomysłów (moduł III)

- Data: 2026-10-03
- Status: przyjęta

## Kontekst

Użytkownicy zgłaszają pomysły oddolnie, część szuka finansowania. Potrzebne: fiszka pomysłu, generator wniosku (w czasie naboru), canva i asystent. Panel ([ADR 0006](0006-panel-administratora.md)) ma zgłoszenia, wątki, powiadomienia i triaż, więc Kreator dopina się do niego zamiast tworzyć własną skrzynkę.

## Decyzja

- **Wysłana fiszka i wniosek to zwykłe zgłoszenie (`Ticket`)** z prefiksem „[Pomysł z Kreatora]” lub „[Wniosek z Kreatora]” w treści, bez zmian w panelu.
- **Brak kont, dostęp tokenem.** Fiszka, wniosek i canva mają sekretny token (`secrets.token_urlsafe(24)`) w adresie, bez endpointów listujących. „Twoje szkice” to skrót w `localStorage`.
- **Nabory i szablony canv to dane** (tabele `nabory`, `szablony_canvy`). Pola wniosku mają limit znaków, wskazówkę i listę `zrodla`: pól fiszki, z których wolno je wypełnić. Pole bez źródeł (budżet, wskaźniki) zawsze zostaje „do uzupełnienia”. Szablon canvy ładowany z `backend/app/data/canva_*.json` przy starcie.
- **Generator według dat naboru** (`termin_od <= dziś <= termin_do`). Tworzenie i wysyłka wniosku poza naborem: 409 z komunikatem po polsku. Odczyt i eksport istniejącego szkicu działają zawsze.
- **AI nic nie dopowiada.** Wypełnianie fiszki: wartości spoza słowników (etap, obszar) są odrzucane. Szkic wniosku: model dostaje tylko dane fiszki i pola wniosku, których fiszka dotyczy; tekst z liczbą spoza fiszki jest zastępowany tekstem złożonym z danych fiszki. Brak klucza lub awaria: ten sam tekst bez AI i komunikat po polsku.
- **Podobne innowacje** z deterministycznego dopasowania panelu ([ADR 0006](0006-panel-administratora.md)), próg `prog_dopasowania`, każdy wynik ze źródłem.
- **Dopasowanie naboru** („Znajdź finansowanie”) po obszarze i słowach kluczowych odbiorcy, z uzasadnieniem w jednym zdaniu.
- **Błędy biznesowe** to `KreatorError` (status + komunikat po polsku), jeden handler w `main.py`.

## Konsekwencje

- Utrata linku = utrata dostępu do szkicu. Publiczne endpointy chroni limit w nginx.
- Treść zgłoszenia ze wniosku nie przechodzi walidacji długości formularza `/zglos` (wniosek bywa dłuższy).
- Dopasowanie naborów to proste porównanie tekstu: przewidywalne, ale zależne od słów kluczowych wpisanych w naborze.
- Szablon canvy odtworzony z PDF (zepsute polskie znaki), do sprawdzenia z oryginałem.
- Dzienny limit wywołań AI usunięty (decyzja Nikodema, 2026-10-04).
