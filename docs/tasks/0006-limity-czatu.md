# 0006. Limity i kontrola kosztu czatu

- Status: zrobione
- Osoba: Bartłomiej (backend), Bartosz (nginx, konfiguracja), Nikodem (panel dostawcy)
- PR: #16, #22, #26

## Jak działa

Cztery warstwy chronią publiczny czat przed kosztem i zablokowaniem usługi.

1. nginx, `location = /api/v1/chat` (`frontend/nginx.conf`): 10 zapytań na minutę na IP (`burst=5`), 2 równoległe strumienie na IP, body do 64 KB, strumień do 120 s. Po przekroczeniu 429.
2. Walidacja requestu (`schemas/chat.py`): do 30 wiadomości, wiadomość użytkownika do 1500 znaków, asystenta i `summary` do 4000, cała historia do 20 000. Za długa historia daje 422.
3. Backend: do 6 wywołań modelu na request, limit wyjścia `LLM_MAX_COMPLETION_TOKENS` (8000, obejmuje tokeny rozumowania). Dzienny licznik tokenów w pamięci procesu (`services/token_budget.py`). Po przekroczeniu `LLM_DAILY_TOKEN_LIMIT` albo przy `CHAT_ENABLED=false` czat odpowiada 503 przed otwarciem strumienia i nie woła modelu.
4. Dostawca: limit budżetu i alert w panelu dostawcy, osobny klucz na demo.

Frontend przycina historię do limitów, pole wiadomości ma 1500 znaków, a dla 429 i 503 pokazuje komunikat (dla 503 tekst `detail` z backendu).

- Licznik dzienny zeruje się po restarcie i działa przy jednym workerze.
- `limit_req` liczy po `$binary_remote_addr`. Za innym proxy wszyscy mieliby ten sam adres.
- Adresu IP nie zapisujemy w bazie ani w logach aplikacji (dana osobowa).
