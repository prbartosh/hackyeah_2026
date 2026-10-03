# 0006. Panel administratora (moduł VI)

- Data: 2026-10-03
- Status: proponowana

## Kontekst

Panel dla pracowników ROPS: skrzynka zgłoszeń z triażem AI, upload dokumentu projektu do karty innowacji, edycja kart i radar trendów. W repo nie było: kont i ról, tabeli kart (innowacje to pliki JSON, [ADR 0004](0004-obiekt-innowacji.md) §10), zgłoszeń, wątków, powiadomień, embeddingów ani parserów dokumentów. Tabela `potrzeby` ([zadanie 0004](../tasks/0004-zapis-potrzeb.md)) jest zaplanowana, ale jej nie ma, więc radar nie ma z czego korzystać poza zgłoszeniami.

## Decyzja

- **Dostęp:** jeden sekret `ADMIN_TOKEN` w `.env`, nagłówek `Authorization: Bearer`, sprawdzany na każdym `/api/v1/admin/*` (porównanie stałoczasowe). Brak tokenu w env wyłącza panel (503). Bez tabeli użytkowników. Frontend trzyma token w `sessionStorage`.
- **Karty w PostgreSQL:** tabela `innowacje` z polami pliku źródłowego, nakładką (typowane listy), `wdrozenie`, `poziom_dowodu`, `status` (`szkic` / `opublikowana` / `zarchiwizowana`), `zrodlo` (`rops` / `dokument` / `panel`) i embeddingiem. Przy starcie 115 kart z JSON importuje się raz (jako opublikowane). `InnovationRepository` zachowuje swój synchroniczny interfejs: po starcie i po każdej zmianie w panelu dostaje migawkę opublikowanych kart z bazy. Bez bazy działa jak dotąd, z samych plików. Czat i Zasobnik widzą zatwierdzone karty bez zmian w ich kodzie.
- **Zgłoszenia:** formularz publiczny `POST /api/v1/zgloszenia` (treść, opcjonalnie imię i e-mail). Autor dostaje token wątku (link `/watek/:token`), bez konta. Wątek (`wiadomosci_watku`) jest niezależny od zgłoszeń (klucz: token), żeby moduł komunikacji mógł go użyć ponownie.
- **Embeddingi:** od [ADR 0007](0007-deepseek.md) zawsze lokalne (`local-trigram-v1`), bo DeepSeek nie ma API embeddingów. Pierwotnie `LLMService.embed` (OpenAI, `EMBEDDING_MODEL`). Bez klucza działa lokalny zamiennik (haszowany worek słów, model `local-hash-v1`), żeby panel i demo działały offline. Wektory z różnych modeli nie są porównywane, `POST /admin/reindeksuj` przelicza wszystko. Wektory w kolumnie JSON, podobieństwo liczone w Pythonie (Postgres `16-alpine` nie ma pgvectora; skala to setki rekordów).
- **Triaż:** podobne karty z embeddingów (to są jedyne karty, które szkic może cytować), duplikaty po progu (konfigurowalny w panelu), kategoria, pilność i szkic odpowiedzi z jednego wywołania LLM w trybie JSON. Szkic cytuje wyłącznie slugi z listy kandydatów, backend odrzuca resztę. Bez klucza lub przy błędzie: kategoria z najbliższych kart, pilność „średnia”, szkic szablonowy z kartami, a UI pokazuje komunikat po polsku. Szkic zawsze zatwierdza człowiek.
- **Dokument → karta:** pypdf i python-docx, ekstrakcja tekstu, LLM zwraca dla każdego pola `{wartosc, cytat, pewnosc}`. Backend zeruje pole, którego `cytat` nie występuje dosłownie w tekście dokumentu (ochrona przed halucynacją). Wynik to szkic importu, dopiero zatwierdzenie tworzy lub aktualizuje kartę i jej embedding.
- **Limit kosztów:** tabela `uzycie_ai` (dzień, liczba wywołań) i `AI_DAILY_CALL_LIMIT`. Po przekroczeniu funkcje AI przechodzą w tryb ręczny.
- **Radar:** zgłoszenia bez dobrego dopasowania (najlepsze podobieństwo do opublikowanej karty poniżej progu) łączone w klastry po embeddingach, nazwa klastra z LLM (z cache w bazie) lub z najczęstszych słów, trend tygodniowy, z klastra można utworzyć notatkę dla ROPS. Gdy powstanie `potrzeby`, trzeba dołożyć je jako drugie źródło.
- **E-mail:** adapter `EmailSender` z implementacją logującą (`EMAIL_BACKEND=log`). Powiadomienia w aplikacji i licznik nieprzeczytanych działają bez e-maila.

## Konsekwencje

Zyskujemy: panel działający bez klucza OpenAI, jedną ścieżkę zatwierdzania kart, brak zmian w kodzie czatu.
Tracimy: jeden wspólny token zamiast kont (brak śladu, kto co zatwierdził), lokalny embedding jest słabszy niż model OpenAI, a podobieństwo w Pythonie nie skaluje się poza tysiące rekordów.
Zmiana wspólnego kodu: `InnovationRepository` (migawka z bazy), `LLMService` (metody `embed` i `complete_json`), `main.py` (start), `deps.py` i `router.py`.
