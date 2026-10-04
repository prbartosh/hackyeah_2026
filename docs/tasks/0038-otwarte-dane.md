# 0038. Otwarte dane

- Status: review
- Osoba: Nikodem
- PR: #57

## Cel

Splot nie zamyka danych w aplikacji (potencjał wdrożeniowy): eksport opublikowanych innowacji i listy dokumentów Zasobnika w CSV i JSON, strona `/otwarte-dane` z opisem, licencjami i przykładem `curl`.

## Kroki

- [x] Backend: `GET /api/v1/otwarte-dane/{innowacje,dokumenty}.{csv,json}` i podsumowanie `GET /api/v1/otwarte-dane`
- [x] CSV w UTF-8 z BOM, separator `;`, `Content-Disposition: attachment`
- [x] Testy pytest (200, nagłówki, kodowanie, brak pól prywatnych, licencje tylko z danych)
- [x] Frontend: strona `/otwarte-dane` i link w stopce
- [x] Nginx: bez zmian, ścieżki trafiają do `location /api/`
- [ ] Sprawdzenie w przeglądarce na działającym stacku

## Notatki

- Licencji nie nadajemy: pole `licencja` wypełnione tylko tam, gdzie jest w danych ROPS; każdy rekord ma `zrodlo: ROPS Kraków`.
- `/docs` i `/openapi.json` nie są wystawione przez nginx, więc strona opisuje endpointy tabelą.
- Komórki CSV zaczynające się od `=`, `+`, `-`, `@` dostają prefiks `'` (formuły w Excelu).
