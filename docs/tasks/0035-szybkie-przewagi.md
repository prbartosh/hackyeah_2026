# 0035. Szybkie przewagi: prosty język, czytanie na głos, deklaracja dostępności, trafność

- Status: w toku
- Osoba: Wiktor
- PR: 

## Cel

Punkty 1–5 z [pomysly-na-przewage.md](../pomysly-na-przewage.md): funkcje, które w krótkim czasie dokładają punktów za dostępność i potencjał wdrożeniowy, bez wymyślania danych.

## Kroki

- [x] „Powiedz prościej” na stronie innowacji: `POST /api/v1/innovations/{slug}/prosty-jezyk`, tekst ETR przez port LLM, cache w pamięci na kartę, źródło ROPS pod tekstem, limit nginx wspólny z czatem
- [x] „Przeczytaj” (Web Speech API, bez serwera) przy odpowiedziach czatu, opisie innowacji i tekście w prostym języku
- [x] Deklaracja dostępności `/dostepnosc` z wynikiem axe z zadania [0022](0022-dostepnosc-nvda-klawiatura.md), link w stopce
- [ ] Strona „Ile to kosztuje ROPS”: czeka na liczby (cena modelu, hosting, utrzymanie)
- [x] Metryka top 3 w `eval_matchmaking.py`, zgłoszenia potoczne i z literówkami (#29–36) w [zestawie testowym](../zestaw-testowy.md)
- [ ] Pełny przebieg ewaluacji na DeepSeek i liczba na slajd
- [ ] Testy backendu (`pytest`) na stacku z Pythonem 3.12

## Notatki

- Deklaracja jest uczciwa: status „częściowo zgodna” (brak sesji NVDA, PDF-y ROPS bez znaczników, filmy z YouTube, tekst AI bez weryfikacji przez osoby z niepełnosprawnością intelektualną). Kontakt przez „Zgłoś potrzebę”, dane koordynatora dostępności uzupełnia ROPS po wdrożeniu.
- Prosty język nie zapisuje tekstu w bazie: cache żyje do restartu backendu, klucz to slug i treść karty (edycja karty = nowy tekst).
