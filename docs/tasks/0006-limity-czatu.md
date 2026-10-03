# 0006. Limity i kontrola kosztu czatu

- Status: todo (wartości do zatwierdzenia)
- Osoba: Bartłomiej (backend), Bartosz (nginx, konfiguracja)

## Cel

Publiczny czat bez logowania wywołuje płatny model. Jedna osoba albo skrypt nie może wygenerować dużego kosztu ani zablokować usługi innym.

## Stan obecny

- Walidacja requestu: do 40 wiadomości, do 4000 znaków na wiadomość (`schemas/chat.py`).
- Do 6 wywołań modelu na request (`MAX_LLM_CALLS`), `max_completion_tokens=16000`.
- Zużycie tokenów jest logowane (`services/llm.py`).
- Brak limitu zapytań na IP i limitu dziennego.

Najgorszy przypadek dziś: 40 × 4000 znaków historii (ok. 50 tys. tokenów) + katalog (ok. 24 tys.) × 6 wywołań, czyli ok. 450 tys. tokenów wejścia na jeden request.

## Propozycja: cztery warstwy

**1. nginx (bez kodu), tylko `location = /api/v1/chat`:**

| Limit | Wartość startowa |
|---|---|
| Zapytania na IP (`limit_req`) | 10 na minutę, `burst=5`, potem 429 |
| Równoległe strumienie na IP (`limit_conn`) | 2 |
| Rozmiar body (`client_max_body_size`) | 64 KB |
| Czas strumienia (`proxy_read_timeout`) | 120 s |

**2. Backend: walidacja requestu (Pydantic):**

| Limit | Teraz | Propozycja |
|---|---|---|
| Wiadomości w historii | 40 | 30 |
| Znaki w wiadomości użytkownika | 4000 | 1500 |
| Znaki w całej historii | brak | 20 000 |
| `max_completion_tokens` | 16 000 | 4 000 |
| Wywołania modelu na request | 6 | 6 |

**3. Backend: budżet dzienny i wyłącznik:**
- Licznik tokenów (wejście + wyjście) z `usage`, sumowany na dzień. Na demo w pamięci procesu (jeden worker), docelowo w Postgresie.
- `LLM_DAILY_TOKEN_LIMIT` w `.env`. Po przekroczeniu czat zwraca zdarzenie `error` z komunikatem „Usługa chwilowo niedostępna, spróbuj jutro” i nie woła modelu.
- `CHAT_ENABLED=false` wyłącza czat bez wdrożenia nowej wersji.

**4. Dostawca modelu:**
- Limit budżetu i alert w panelu projektu OpenAI. To ostatnia linia obrony, gdyby warstwy 1–3 zawiodły.
- Osobny klucz API na demo, nie współdzielony z innymi projektami.

## Kroki

- [ ] Zatwierdzić wartości (tabela wyżej)
- [ ] nginx: `limit_req_zone`, `limit_conn_zone` i osobny `location = /api/v1/chat`
- [ ] Backend: nowe limity w `schemas/chat.py`, limit całej historii, niższy `max_completion_tokens`
- [ ] Backend: licznik dzienny, `LLM_DAILY_TOKEN_LIMIT`, `CHAT_ENABLED` w `core/config.py` i `.env.example`
- [ ] Frontend: komunikat dla 429 i dla zdarzenia `error` z budżetu, blokada wysyłki w trakcie strumienia
- [ ] Limit budżetu i alert u dostawcy
- [ ] Testy: 429 z nginx, odrzucenie za długiej historii, zablokowany czat po przekroczeniu budżetu

## Notatki

- `limit_req` liczy po `$binary_remote_addr`. Jeśli przed nginx stanie inny proxy, wszyscy będą mieli ten sam adres i trzeba przejść na `X-Forwarded-For` z zaufanego proxy.
- Adres IP to dana osobowa. Nie zapisujemy go w bazie ani w logach aplikacji.
- `LLM_DAILY_TOKEN_LIMIT` ustawić po zmierzeniu zużycia jednej typowej rozmowy (dane są w logach).
