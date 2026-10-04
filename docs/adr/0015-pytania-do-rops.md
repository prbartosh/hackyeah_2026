# 0015. Pytania do ROPS: publikacja za zgodą i moderacja

- Data: 2026-10-04
- Status: przyjęta

## Kontekst

Zgłoszenie jest prywatne i dotyczy konkretnej sprawy, a wiele pytań („jak to działa?”) się powtarza. Pytania są publiczne i bez konta, więc ryzyko to spam, wyciek danych osobowych i publikacja bez wiedzy autora.

## Decyzja

- Osobna tabela `pytania`, niezależna od `Ticket`: pytanie ma treść, opcjonalną kategorię, opcjonalne imię i e-mail, pole `zgoda_na_publikacje`, odpowiedź i status `nowe` / `odpowiedziane` / `opublikowane` / `ukryte`.
- Publikacja tylko za zgodą: serwis odmawia `opublikuj`, gdy autor nie zaznaczył zgody albo nie ma odpowiedzi. Zgoda jest domyślnie odznaczona, a w formularzu opisana wprost.
- Moderacja ROPS: pytanie nigdy nie jest publiczne samo z siebie. Pracownik odpowiada, potem świadomie publikuje albo ukrywa (`require_admin`, `/api/v1/admin/pytania`). Pracownik może nie opublikować pytania mimo zgody.
- Publicznie widać tylko treść, kategorię, odpowiedź i datę. Imię i e-mail autora nie opuszczają panelu (osobny schemat publiczny).
- Gdy autor podał e-mail, po pierwszej odpowiedzi dostaje ją e-mailem przez `EmailSender` (na demo to log). Nowe pytanie tworzy powiadomienie w panelu i, gdy ustawiono `ADMIN_NOTIFY_EMAIL`, e-mail do administratora.
- Wyszukiwanie `GET /api/v1/pytania?q=&kategoria=` z tą samą normalizacją co wyszukiwarka innowacji.
- Limit nginx jak dla pozostałych formularzy.
- Bez szkicu odpowiedzi AI: wymagałby osobnego promptu (pytania ogólne nie mają kart-kandydatów).

## Konsekwencje

- Baza wiedzy rośnie z prawdziwych pytań, a autor kontroluje, czy jego pytanie jest publiczne.
- Treść pytania może zawierać dane osobowe wpisane przez autora; pracownik przed publikacją powinien je zanonimizować (na razie odpowiedź można edytować, treści pytania nie).
- Pracownik ROPS jest wąskim gardłem: odpowiedzi i publikacja są ręczne.
