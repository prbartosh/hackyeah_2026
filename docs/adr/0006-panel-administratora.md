# 0006. Panel administratora (moduł VI)

- Data: 2026-10-03
- Status: przyjęta

## Kontekst

Panel dla pracowników ROPS: skrzynka zgłoszeń z triażem AI, upload dokumentu projektu do karty innowacji, edycja kart i radar trendów. Wymaga kont lub tokenu, tabeli kart (wcześniej innowacje były tylko w plikach JSON, [ADR 0004](0004-obiekt-innowacji.md)), zgłoszeń, wątków, powiadomień i parserów dokumentów.

## Decyzja

- **Dostęp:** jeden sekret `ADMIN_TOKEN`, nagłówek `Authorization: Bearer` na każdym `/api/v1/admin/*` (porównanie stałoczasowe). Brak tokenu w env wyłącza panel (503). Bez tabeli użytkowników, frontend trzyma token w `sessionStorage`.
- **Karty w PostgreSQL:** tabela `innowacje` (pola źródłowe, nakładka, `wdrozenie`, `poziom_dowodu`, `status` `szkic` / `opublikowana` / `zarchiwizowana`, `zrodlo` `rops` / `dokument` / `panel`). Przy starcie 115 kart z JSON importuje się raz jako opublikowane. `InnovationRepository` zachowuje synchroniczny interfejs: po starcie i po każdej zmianie w panelu dostaje migawkę opublikowanych kart. Bez bazy działa z plików. Czat i Zasobnik widzą zatwierdzone karty bez zmian w kodzie.
- **Zgłoszenia:** publiczny `POST /api/v1/zgloszenia` (treść, opcjonalnie imię i e-mail). Autor dostaje token wątku (link `/watek/:token`), bez konta. Wątek (`wiadomosci_watku`) jest niezależny od zgłoszeń (klucz: token), żeby inne moduły mogły go użyć.
- **Dopasowanie deterministyczne** (`services/matching.py`): DeepSeek nie ma API embeddingów ([ADR 0007](0007-deepseek.md)), więc dopasowanie jest bez embeddingów i tłumaczy wynik. Zgłoszenie dostaje tagi ze słownika ([ADR 0004](0004-obiekt-innowacji.md)) po etykietach i aliasach (całe frazy; słowa od 6 liter po pierwszych 6 literach). Karta pasuje według ważonego pokrycia tagów przez jej nakładkę (problemy 3, grupy docelowe 2, miejsca i typy rozwiązań 1), przy dopasowaniu kart (`CardService.rank`, kreator, triaż) wynik to 40% pokrycia tagów i 60% podobieństwa TF-IDF po 4-literowych rdzeniach słów (`TfidfIndex`, IDF liczony na opublikowanych kartach, nazwa i problem karty liczone podwójnie, lokalnie bez API; stałe `VECTOR_WEIGHT` i `VECTOR_SCALE` w `matching.py`). Karta pasująca tylko ogólnym tagiem („Dzieci”) nie wygrywa z kartą o tych samych słowach. Karta bez żadnego wspólnego tagu, bez nakładki albo zgłoszenie bez tagów: sam TF-IDF razy `TEXT_ONLY_FACTOR` (0,6), więc potrzeba mocniejszego podobieństwa słów. Sam wspólny tag miejsca lub typu rozwiązania (waga 1) nie jest dowodem, liczy się jak sam tekst (`STRONG_TAG_WEIGHT`). TF-IDF liczy się dopiero przy co najmniej 2 wspólnych słowach (`MIN_SHARED_TERMS`, chyba że zapytanie ma jedno słowo), bo 4-literowy rdzeń daje kolizje (kosmiczne/kosmetyki). Bez wektora (duplikaty, radar) zostają trigramy. Na zestawie testowym bez modelu (36 zgłoszeń, próg 0,30): top 1 z 19 do 28 z 35, top 3 z 25 do 32 z 35; zgłoszenie spoza bazy (nr 28) nie dostaje karty. Przy każdej karcie widać `powody` (etykiety wspólnych tagów). W kreatorze, przy kluczu `TYPESAFE_API_KEY`, kandydatów z tego dopasowania ocenia i porządkuje Jev ([ADR 0016](0016-jev-oceny-trafnosci.md)). Progi w panelu: `prog_dopasowania` (pokrycie tagów), `prog_duplikatow` i `prog_klastra` (trigramy). Kolumny `embedding` i `embedding_model` w `innowacje` i `zgloszenia` są nieużywane.
- **Triaż:** jedno wywołanie LLM w trybie JSON: kategoria, pilność, tagi (slugi ze słownika), duplikaty po progu i szkic odpowiedzi. Szkic cytuje wyłącznie karty-kandydatów z `matching.py`, backend odrzuca resztę. Bez klucza lub przy błędzie: kategoria z najbliższych kart, pilność „średnia”, szkic szablonowy, a UI pokazuje komunikat po polsku. Szkic zawsze zatwierdza człowiek.
- **Dokument → karta:** pypdf i python-docx, LLM zwraca dla każdego pola `{wartosc, cytat, pewnosc}`. Backend zeruje pole, którego `cytat` nie występuje dosłownie w tekście (ochrona przed halucynacją). Wynik to szkic importu, dopiero zatwierdzenie tworzy lub aktualizuje kartę.
- **Radar:** zgłoszenia bez dobrego dopasowania (najlepsze poniżej progu) grupowane po pierwszym tagu `problemy`, a zgłoszenia bez tagu trigramami tekstu (nazwa z LLM z cache lub z najczęstszych słów). Trend tygodniowy, z klastra można utworzyć notatkę dla ROPS. Źródło to tylko zgłoszenia, tabela `potrzeby` służy [ADR 0012](0012-podobne-przypadki.md).
- **E-mail:** adapter `EmailSender` z implementacją logującą (`EMAIL_BACKEND=log`). Powiadomienia w aplikacji działają bez e-maila.
- Dzienny limit wywołań AI usunięty (decyzja Nikodema, 2026-10-04).

## Konsekwencje

- Panel działa bez klucza OpenAI, jedna ścieżka zatwierdzania kart, czat bez zmian w kodzie.
- Jeden wspólny token zamiast kont: brak śladu, kto co zatwierdził.
- Dopasowanie po frazach pomija tekst spoza słownika (taki wpis trafia do radaru, tak ma być), a trigramy w Pythonie nie skalują się poza tysiące rekordów.
