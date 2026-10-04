# Kreator pomysłów (moduł III)

Decyzje: [ADR 0008](adr/0008-kreator-pomyslow.md).

## Uruchomienie

1. `docker compose up --build` (backend sam ładuje szablon canvy).
2. Dane demo (idempotentne): `docker compose exec backend python scripts/seed_kreator.py`: 4 fiszki (jedna wysłana), 2 nabory (aktywny i zakończony), wypełniona canva.
3. Bez Dockera: `python backend/scripts/dev_panel.py` (SQLite, token `demo-token`) i `npm --prefix frontend run dev`.
4. Kreator: <http://localhost:8080/kreator>. Nabory w panelu: `/admin/nabory`.

Bez `LLM_API_KEY` formularze działają ręcznie.

## Przejście demo

1. **Opis → fiszka.** `/kreator` → „Opisz pomysł” → opis własnymi słowami (lub „Podyktuj”) → „Wypełnij fiszkę za mnie”. Z kluczem AI pola są wstępnie wypełnione i oznaczone. Bez klucza: komunikat i ręczne wypełnienie.
2. **Kroki.** Na czym polega → Dla kogo → Etap → Dodatkowe → Podgląd. Pod „Na czym polega” widać „Takie rozwiązania już działają” (ze źródłem). Szkic zapisuje się sam. Powrót: „Twoje szkice” lub adres.
3. **Wysłanie.** „Wyślij pomysł do ROPS” → link do wątku. W `/admin` rośnie licznik powiadomień, zgłoszenie ma prefiks „[Pomysł z Kreatora]”. Odpowiedź jak na zwykłe zgłoszenie.
4. **Finansowanie.** Po wysłaniu (lub na karcie innowacji) „Znajdź finansowanie” → aktywny nabór z uzasadnieniem → „Przygotuj szkic wniosku” → pola z licznikami, źródłem i „Do uzupełnienia” → „Pobierz DOCX” / tekst → opcjonalnie „Wyślij do ROPS”.
5. **Poza naborem.** W `/admin/nabory` przesuń terminy w przeszłość: ekran pokaże, kiedy będzie następny nabór, a utworzenie wniosku zwróci komunikat.
6. **Canva.** `/kreator/canva` → 7 kroków + podgląd → „Drukuj” lub „Pobierz DOCX”. Demo: `/kreator/canva/demo-canva-przyklad`.
7. **Asystent.** Na podglądzie fiszki i po wysłaniu: „Zadaj mi pytania”.

## Współdzielone z panelem

`Ticket`, `ThreadMessage`, `Notification`, `/watek/:token`, `TicketService.create`.

## Znane ograniczenia

- Limit w nginx tylko dla POST (20 na minutę na IP, zapas 10), autozapis (PUT) bez limitu. Brak kont: utrata linku to utrata szkicu.
- Szablon canvy odtworzony z PDF z zepsutym tekstem; do sprawdzenia z oryginałem.
- Nabory demo są wymyślone. Prawdziwe wpisuje admin.
- Brak wizualizacji pomysłu.
- Brak testu z czytnikiem ekranu.
