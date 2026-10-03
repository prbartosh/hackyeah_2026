# 0021. Redukcja kosztu rozmowy

- Status: todo
- Osoba: Bartłomiej (backend)
- PR:

## Cel

Jedna rozmowa mieści się w budżecie tak, by demo i jury mogły przejść wiele rozmów dziennie. Obecnie: 6 wywołań modelu i ok. 297 tys. tokenów na rozmowę.

## Kroki

- [ ] Rozpisać, na co idą tokeny (system prompt, katalog innowacji, historia, narzędzia, rozumowanie), na podstawie logów `LLM turn`
- [ ] Sprawdzić, czy cache promptu DeepSeek działa: stały prefiks (prompt + katalog + narzędzia) przed częścią zmienną
- [ ] Skrócić katalog innowacji w prompcie (np. tylko pola potrzebne do dopasowania)
- [ ] Ograniczyć liczbę wywołań i rund (max 4 rundy pytań jest, sprawdzić, czy wszystkie wywołania są potrzebne)
- [ ] Ewentualnie niższy `reasoning_effort` tam, gdzie to nie obniża jakości
- [ ] Powtórny pomiar, wynik w `docs/status.md`. Ewentualny zmieniony limit dzienny ustawia Nikodem

## Notatki

- 2026-10-04: pomiar statyczny: prompt systemowy ma ok. 135 tys. znaków, z czego katalog 115 innowacji ok. 123 tys. i słownik ok. 8 tys. Każde z 6 wywołań w rozmowie wysyła go w całości (stały prefiks, więc dostawca może go cache'ować). Decyzja zespołu: na razie zostaje bez zmian. Uwaga: przy `LLM_DAILY_TOKEN_LIMIT=300000` to ok. 1 rozmowa dziennie.

- Zmiana stałego zestawu narzędzi lub promptu jednorazowo unieważnia cache.
