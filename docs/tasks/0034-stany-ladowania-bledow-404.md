# 0034. Stany ładowania, pustych wyników, błędów i 404

- Status: todo
- Osoba: 
- PR: 

## Cel

Każdy ekran ma przemyślany stan ładowania, brak danych i błąd. Dziś to głównie tekst „Wczytywanie…” (ok. 50 miejsc w kodzie, `Loading` w `admin/ui.tsx` i własne komunikaty w stronach) i ogólne alerty.

## Kroki

- [ ] Wspólne komponenty `Skeleton`, `EmptyState` (ilustracja z 0027, tytuł, opis, akcja) i `ErrorState` (przyczyna, co zrobić, „Spróbuj ponownie”) w `components/`. Wszystkie z `role="status"` lub `role="alert"` jak dziś.
- [ ] Zamienić komunikaty w: `InnovationPage`, `ServiceCardPage`, `DocumentPage`, `ZasobnikPage`, `ThreadPage`, kreator, panel.
- [ ] Szkielet tylko gdy ładowanie trwa > 300 ms (bez migania przy szybkiej sieci). Zarezerwowane miejsce, bez skoku układu.
- [ ] Strona 404 (`NotFoundPage.tsx`): ilustracja, wyszukiwarka zasobnika, linki do modułów, „Zgłoś problem ze stroną”.
- [ ] Błąd połączenia z czatem (limit tokenów, brak klucza, przerwane SSE): komunikat po ludzku i dalsza droga (Zasobnik, Zgłoś potrzebę), a nie tylko „Spróbuj ponownie”.
- [ ] Tryb offline: krótki pasek „Brak internetu” (`navigator.onLine`), znika po powrocie sieci.

## Notatki

- Zależy od 0027 i 0028.
- Teksty komunikatów w prostym języku (ETR), bez kodów błędów.
