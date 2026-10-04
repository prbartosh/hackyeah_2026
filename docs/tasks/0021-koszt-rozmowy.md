# 0021. Redukcja kosztu rozmowy

- Status: todo
- Osoba: Bartłomiej
- PR:

## Cel

Opcjonalne: niższy koszt i krótszy czas odpowiedzi czatu. Dziś 6 wywołań modelu i ok. 297 tys. tokenów na rozmowę.

## Kroki

- [ ] Rozpisać, na co idą tokeny (prompt systemowy, katalog innowacji, historia, narzędzia, rozumowanie), na podstawie logów `LLM turn`
- [ ] Sprawdzić, czy działa cache promptu DeepSeek: stały prefiks (prompt + katalog + narzędzia) przed częścią zmienną
- [ ] Skrócić katalog innowacji w prompcie (tylko pola potrzebne do dopasowania)
- [ ] Sprawdzić, czy wszystkie wywołania są potrzebne (`MAX_ROUNDS = 4` rundy pytań)
- [ ] Ewentualnie niższy `reasoning_effort` tam, gdzie nie obniża jakości
- [ ] Powtórny pomiar, wynik w `docs/status.md`

## Notatki

- Pomiar statyczny: prompt systemowy ok. 135 tys. znaków (katalog 115 innowacji ok. 123 tys., słownik ok. 8 tys.), wysyłany w całości w każdym z 6 wywołań.
- Zmiana stałego zestawu narzędzi lub promptu jednorazowo unieważnia cache.
