# 0006. Limity czatu

- Status: zrobione
- Osoba: Bartłomiej (backend), Bartosz (nginx, konfiguracja), Nikodem (panel dostawcy)
- PR: #16, #22, #26

## Jak działa

Trzy warstwy chronią publiczny czat przed nadużyciem i zablokowaniem usługi.

1. nginx, `location = /api/v1/chat` (`frontend/nginx.conf`): 10 zapytań na minutę na IP (`burst=5`), 2 równoległe strumienie na IP, body do 64 KB, strumień do 120 s. Po przekroczeniu 429.
2. Walidacja requestu (`schemas/chat.py`): do 30 wiadomości, wiadomość użytkownika do 1500 znaków, asystenta i `summary` do 4000, cała historia do 20 000. Za długa historia daje 422.
3. Backend: do 6 wywołań modelu na request. Przy `CHAT_ENABLED=false` albo bez klucza modelu czat odpowiada 503 przed otwarciem strumienia i nie woła modelu.

Dzienny budżet tokenów (`LLM_DAILY_TOKEN_LIMIT`) i limit tokenów wyjścia (`LLM_MAX_COMPLETION_TOKENS`) usunięto (decyzja Nikodema, 2026-10-04). Koszt pilnujemy limitem i alertem w panelu dostawcy, z osobnym kluczem na demo.

Frontend przycina historię do limitów, pole wiadomości ma 1500 znaków, a dla 429 i 503 pokazuje komunikat (dla 503 tekst `detail` z backendu).

- `limit_req` liczy po `$binary_remote_addr`. Za innym proxy wszyscy mieliby ten sam adres.
- Adresu IP nie zapisujemy w bazie ani w logach aplikacji (dana osobowa).
