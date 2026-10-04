# 0035. Szybkie przewagi: prosty język, czytanie na głos, deklaracja dostępności, trafność

- Status: w toku
- Osoba: Wiktor
- PR: #54

## Cel

Punkty 1–5 z [pomysly-na-przewage.md](../pomysly-na-przewage.md): funkcje dokładające punktów za dostępność i potencjał wdrożeniowy, bez wymyślania danych.

## Kroki

- [x] „Powiedz prościej” na stronie innowacji: `POST /api/v1/innovations/{slug}/prosty-jezyk`, tekst ETR przez port LLM, cache w pamięci, źródło ROPS pod tekstem, limit nginx wspólny z czatem
- [x] „Przeczytaj” (Web Speech API) przy odpowiedziach czatu, opisie innowacji i prostym języku
- [x] Deklaracja dostępności `/dostepnosc` z wynikiem axe z [0022](0022-dostepnosc-nvda-klawiatura.md), link w stopce
- [x] Metryka top 3 w `eval_matchmaking.py`, zgłoszenia potoczne i z literówkami (#29–36) w [zestawie testowym](../zestaw-testowy.md)
- [ ] Pełny przebieg ewaluacji na DeepSeek i liczba na slajd
- [ ] Testy backendu (`pytest`) na Pythonie 3.12

## Notatki

- Strona „Ile to kosztuje ROPS” pominięta: w repo nie ma cen modelu, hostingu ani utrzymania. Zostaje slajd i roadmapa.
- Deklaracja ma status „częściowo zgodna” (brak sesji NVDA, PDF-y ROPS bez znaczników, filmy YouTube, tekst AI bez weryfikacji przez osoby z niepełnosprawnością intelektualną). Dane koordynatora dostępności uzupełnia ROPS po wdrożeniu.
- Prosty język nie zapisuje tekstu w bazie: cache żyje do restartu backendu, klucz to slug i treść karty.
