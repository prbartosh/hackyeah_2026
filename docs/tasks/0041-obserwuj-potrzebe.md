# 0041. Obserwuj potrzebę (moduł V)

- Status: review
- Osoba: Wiktor
- PR: #68

## Cel

Punkt 8 z [pomysly-na-przewage.md](../pomysly-na-przewage.md). Gdy w bazie nie ma pasującego rozwiązania, autor zgłoszenia może je obserwować. Kiedy ROPS opublikuje pasującą kartę, autor dostaje powiadomienie w wątku i e-mailem. Domyka to pętlę „potrzeba → nowa innowacja”.

## Kroki

- [x] Migracja 0011: `zgloszenia.obserwuje`, `zgloszenia.powiadomiono_o`
- [x] `TicketCreate.obserwuj`, flaga widoczna w wątku i w panelu
- [x] `TicketService.notify_watchers`: dopasowanie jak w triażu (`matching.py`, próg `prog_dopasowania`), stały tekst z linkiem do karty w wątku, e-mail, powiadomienie w panelu, każda karta najwyżej raz na zgłoszenie
- [x] Wywołanie przy publikacji karty: edycja karty (szkic → opublikowana) i zatwierdzenie importu dokumentu
- [x] Frontend: pole „Powiadom mnie…” na `/zglos` (domyślnie zaznaczone, gdy przychodzimy z czatu bez dopasowania), informacja w wątku, znacznik w panelu
- [x] Testy pytest

## Notatki

- Bez AI: tekst powiadomienia jest stały i zawiera tylko nazwę karty i link. Podpis w wątku to „Powiadomienie automatyczne”, więc widać, że nie pisał go człowiek.
- Ponowna publikacja tej samej karty nie wysyła drugiego powiadomienia (`powiadomiono_o`).
