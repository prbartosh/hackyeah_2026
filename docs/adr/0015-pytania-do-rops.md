# 0015. Pytania do ROPS: publikacja za zgodą i moderacja

- Data: 2026-10-04
- Status: przyjęta

## Kontekst

Moduł V (platforma komunikacji) ma prowadzić dialog ROPS z użytkownikami. Zgłoszenie potrzeby jest prywatne i dotyczy konkretnej sprawy. Wiele pytań („jak to działa?”) powtarza się i odpowiedź przydałaby się innym. Pytania są publiczne i bez konta, więc ryzyko to spam, wyciek danych osobowych i publikacja treści bez wiedzy autora.

## Decyzja

- Osobna tabela `pytania` (migracja `0010`), niezależna od `Ticket`: pytanie ma treść, opcjonalną kategorię, opcjonalne imię i e-mail, pole `zgoda_na_publikacje`, odpowiedź i status `nowe` / `odpowiedziane` / `opublikowane` / `ukryte`.
- Publikacja tylko za zgodą: serwis odmawia `opublikuj`, gdy autor nie zaznaczył zgody albo nie ma odpowiedzi. Zgoda jest domyślnie odznaczona, a w formularzu opisana wprost.
- Moderacja ROPS: pytanie nigdy nie jest publiczne samo z siebie. Pracownik odpowiada, potem świadomie publikuje albo ukrywa (`require_admin`, `/api/v1/admin/pytania`). Pracownik może też nie publikować pytania, na które autor się zgodził.
- Publicznie widać tylko treść, kategorię, odpowiedź i datę. Imię i e-mail autora nie opuszczają panelu (osobny schemat publiczny).
- Gdy autor podał e-mail, po pierwszej odpowiedzi dostaje ją e-mailem przez `EmailSender` (na demo to log). Nowe pytanie tworzy powiadomienie w panelu i, gdy ustawiono `ADMIN_NOTIFY_EMAIL`, e-mail do administratora.
- Wyszukiwanie `GET /api/v1/pytania?q=&kategoria=` używa tych samych funkcji normalizacji co wyszukiwarka innowacji (wielkość liter i polskie znaki bez znaczenia).
- Limit nginx jak dla pozostałych publicznych formularzy.
- Bez szkicu odpowiedzi AI: wzorzec `szkic_odpowiedzi` jest wbudowany w prompt triażu zgłoszeń, a pytania ogólne nie mają kart-kandydatów, więc użycie go wymagałoby osobnego promptu.

## Konsekwencje

- Baza wiedzy rośnie z prawdziwych pytań, a autor kontroluje, czy jego pytanie jest publiczne.
- Treść pytania może zawierać dane osobowe wpisane przez autora; pracownik przed publikacją powinien je zanonimizować (na razie odpowiedź można edytować, treści pytania nie).
- Pracownik ROPS jest wąskim gardłem: odpowiedzi i publikacja są ręczne.
- Migracja `0010` wymaga wcześniejszej migracji `0009` (mentorzy, zadanie 0040).
