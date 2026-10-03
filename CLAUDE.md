# CLAUDE.md — Splot (HackYeah 2026)

Kontekst projektu dla Claude Code. Źródło koncepcji: dokument „Splot – koncepcja platformy (Małopolski Hub Innowacji Społecznych)” (Nikodem Marcinkiewicz, 2026-10-03).

## ⚠️ Zasada obowiązkowa: prowadź dziennik w tym pliku

Po **każdej** zmianie w repo (nowy commit, nowy moduł/endpoint/model/migracja, zmiana architektury, decyzja projektowa, zmiana zależności, odpowiedź mentorów na otwarte pytanie) **zaktualizuj ten plik w tym samym kroku**, bez czekania na prośbę:

1. Dopisz wpis na górze sekcji [Dziennik zmian](#dziennik-zmian) w formacie:
   `- RRRR-MM-DD · <krótki hash lub "niecommitowane"> · <co i dlaczego, 1–2 zdania>`
2. Zaktualizuj [Stan implementacji](#stan-implementacji) (status modułów / ekranów).
3. Jeśli zmieniła się architektura, model danych, komendy lub konwencje — popraw odpowiednią sekcję, żeby plik zawsze opisywał **aktualny** stan, a nie historyczny.
4. Przy commitowaniu: aktualizacja CLAUDE.md wchodzi do tego samego commita (wpis z hashem uzupełnij, jeśli możliwe; inaczej zostaw opis bez hasha).
5. Przy zamknięciu otwartego pytania — odhacz je w [Otwarte pytania](#otwarte-pytania-do-mentorów) i zapisz odpowiedź.

Plik ma być krótki i aktualny: nie duplikuj kodu, opisuj decyzje i stan.

---

## Czym jest Splot

Platforma ROPS Kraków (Małopolski Hub Innowacji Społecznych), która **łączy zgłaszane problemy społeczne z gotowymi innowacjami, wiedzą i ludźmi**. Budujemy wszystkie **7 modułów jako działające funkcje (nie makiety)**; najwięcej pracy idzie w matchmaking.

### Kryteria oceny (i co z nich wynika)

| Kryterium | Waga | Konsekwencja dla nas |
|---|---|---|
| Spełnienie wyzwania | 40% | 10% za matchmaking + 5% za każdy kolejny moduł. Wszystkie 7 działa; matchmaking dopracowany najgłębiej i **zmierzony** |
| Potencjał wdrożeniowy | 20% | Prosty stack w Dockerze, policzony koszt AI, łatwa aktualizacja/moderacja treści przez ROPS |
| Dostępność i intuicyjność | 20% | WCAG 2.1 AA jako warstwa całej platformy, z dowodami (axe, Lighthouse, nagranie z NVDA) |
| Pomysłowość i jakość UI | 10% | Spójna identyfikacja Splot; matchmaking jako wizualne łączenie problemu z rozwiązaniami i ludźmi |
| Jakość materiałów i MVP | 10% | Pitch deck, nagranie demo, README z instrukcją uruchomienia |

Pliki z regulaminem i kryteriami leżą poziom wyżej: `../RULES Wojewodztwo Malopolskie HUBMI.pdf`, `../CRITERIA Wojewodztwo Malopolskie HUBMI.pdf`.

### Użytkownicy / role
- **Mieszkaniec**, **NGO** — zgłaszają problemy i pomysły
- **JST** — diagnozują i szukają gotowych rozwiązań (główny bohater demo)
- **ROPS** — administrują, odpowiadają, analizują
- **Ekspert** — doradza innowatorom i JST
- (tryb asystowany: pracownik CUS / sołtys zgłasza w imieniu mieszkańca)

---

## Fundament: wspólny model danych

Wszystkie moduły czytają i zapisują **te same obiekty**, opisane **tymi samymi kategoriami** (np. zgłoszony problem od razu trafia na mapę ROPS i do trendów; fiszka może przejść do testów bez przepisywania danych). Model ustalamy wspólnie, zanim ktoś zacznie swój moduł.

**Obiekty:** Potrzeba (zgłoszony problem) · Innowacja (karta z Biblioteki Innowacji ROPS) · Fiszka pomysłu · Pilotaż (test innowacji) · Nabór (konkurs grantowy z kryteriami i terminami) · Organizacja/Osoba z rolą · Wątek rozmowy (przypięty do obiektu) · Dokument źródłowy ROPS (raport, Mapa Wyzwań, materiał edukacyjny)

**Wspólne kategorie:**
- Obszar wyzwania (zgodny z Mapą Wyzwań Społecznych)
- Grupa docelowa
- Typ innowacji: przedmiot / metoda / usługa / technologia
- Skala: sołectwo lub osiedle / gmina / powiat / region
- Koszt wdrożenia (przedział)
- Etap dojrzałości: pomysł / prototyp / pilotaż / sprawdzona
- Lokalizacja: kod TERYT gminy

---

## Moduły I–VII

**I. Matchmaking społeczny (obligatoryjny, priorytet)**
1. Opis problemu tekstem lub głosem.
2. AI wyciąga: obszar, grupę docelową, bariery, skalę, gminę.
3. Rozmowa doprecyzowująca (zwykle 4–7 pytań, odpowiedzi do kliknięcia + „inne”) — ma pomóc zrozumieć problem (kogo dotyczy, od kiedy, przyczyna vs objaw, co próbowano, zasoby, kogo zaangażować); AI wplata dane o gminie z ROPS/GUS.
4. Podsumowanie „Twój problem w skrócie” do potwierdzenia; przycisk „Pokaż wyniki teraz”.
5. Wyszukiwanie hybrydowe: embeddingi (pgvector) + słowa kluczowe + filtry kategorii, po kartach innowacji i dokumentach ROPS.
6. Ranking LLM z uzasadnieniem „Dlaczego to pasuje” i „Co trzeba dostosować”, z odwołaniem do pól karty.
7. Widok: lista rozwiązań (+ podobne przypadki, ludzie). Szczegóły: autor, gmina z wdrożeniem, ekspert. Do tego „actionable steps”.
8. Akcje: Dopasuj do mojej gminy (VII), Zapytaj eksperta (V), Zgłoś chęć testu (IV), Zapisz. Brak dopasowania → Kreator pomysłów (III).
9. Ocena „Czy to pomogło?” (krótka ankieta) → analityka ROPS.
- **Ewaluacja:** zbiór testowy 30–50 par „problem → właściwa innowacja”, metryka trafność w top-3; wynik pokazujemy na pitchu.

**II. Zasobnik wiedzy** — indeks dokumentów ROPS (raporty, Mapa Wyzwań, Biblioteka Innowacji, materiały edukacyjne; filmy osadzane, bez transkrypcji); Q&A z cytatami i linkami do źródeł; „Kondycja Małopolski” (filtr obszar/powiat); Biblioteka Innowacji z filtrami; szybka aktualizacja (admin dodaje dokument/link → indeksacja → szkic karty → zatwierdzenie); trendy potrzeb (tylko admin).

**III. Kreator pomysłów** — fiszka pomysłu (kanwa krok po kroku, jedno pytanie na ekran); asystent (pytania naprowadzające, luki, analogie z Biblioteki); wykrywanie podobnych innowacji; generator wniosków (tylko w czasie naboru: AI przenosi fiszkę do wniosku, braki, samoocena wg kryteriów, eksport PDF/DOCX); materiały do prototypowania.

**IV. Tester innowacji** — katalog w fazie testów + „Chcę przetestować u siebie”; feedback (skala/głos/tekst); propozycje usprawnień; AI streszcza opinie; oceny widoczne na kartach.

**V. Platforma aktywnej komunikacji** — wątki przypięte do obiektów (nie ogólny czat); „Zapytaj ROPS” (AI szkicuje, pracownik zatwierdza); katalog ekspertów z dopasowaniem i rezerwacją; tablica „Szukam partnera”; powiadomienia in-app + e-mail.

**VI. Panel administratora** — mapa Małopolski (gminy/powiaty, problemy, wdrożenia, dane demograficzne; lista/tabela jako alternatywa); komunikacja ze zgłaszającymi + statusy; kolejka moderacji; zarządzanie treściami; konfiguracja naborów; trendy i analityka + jakość AI („Czy to pomogło?”, wyszukiwania bez wyniku); role i uprawnienia.

**VII. Middleman innowacji** — JST wybiera innowację; profil gminy z TERYT (GUS + ROPS) + zasoby i budżet; AI generuje kartę usługi społecznej dla CUS/OPS, harmonogram, budżet w przedziałach, ryzyka, partnerów, podstawę prawną „do weryfikacji”; eksport PDF/DOCX; „Konsultuj z ROPS”.

---

## Dostępność (WCAG 2.1 AA) — warstwa całej platformy

- Pasek dostępności na każdym ekranie: wielkość tekstu, wysoki kontrast, czytanie na głos, wpisywanie głosem.
- Tryb tekstu łatwego do czytania (ETR): AI upraszcza dowolną stronę.
- **Każda funkcja AI ma zwykły formularz jako alternatywę.**
- Czat z AI obsługiwany klawiaturą, nowe wiadomości przez `aria-live`.
- Pełna nawigacja klawiaturą, widoczny fokus, etykiety pól, alt-y, **brak CAPTCHA**, jedno zadanie na ekran w długich formularzach.
- Mapa ma alternatywę: lista/tabela gmin.
- Dowody na pitch: axe + Lighthouse + nagranie z NVDA.

Każdy nowy komponent UI musi spełniać powyższe — traktuj to jako wymaganie, nie dodatek.

---

## Architektura i stack

- **Frontend:** React 19 + Vite + TypeScript, react-router-dom 7; w Dockerze build statyczny serwowany przez nginx (proxy `/api` → backend).
- **Backend:** FastAPI (Python ≥3.12), SQLAlchemy 2 async + asyncpg, Alembic, pydantic-settings.
- **Baza:** PostgreSQL 16 — docelowo **z pgvector** jako jedyna baza (dane + wyszukiwanie wektorowe, bez osobnej bazy wektorowej). *Obecnie obraz `postgres:16-alpine` bez pgvector — do zmiany.*
- **3 kontenery** (db, backend, frontend), **2 zewnętrzne źródła** (modele AI, dane GUS/ROPS). Frontend rozmawia tylko z backendem; **tylko backend** łączy się z LLM i źródłami danych.
- **Warstwa pośrednia LLM:** przełączanie OpenAI / Claude / model lokalny w konfiguracji (brak vendor lock-in).
- **Koszt AI policzony:** koszt jednego dopasowania + miesięczny koszt przy realistycznym ruchu.
- REST z OpenAPI (`/docs`); ROPS utrzymuje treści sam przez panel admina; kontenery skalowalne bez zmian w kodzie.

### Konwencje backendu
Przepływ: `endpoint → service → repository → model`. Endpoint nie dotyka ORM bezpośrednio.
- `app/api/v1/endpoints/` — routery, `app/api/deps.py` — zależności (sesja DB)
- `app/services/` — logika biznesowa, `app/repositories/` — zapytania
- `app/models/` — ORM, `app/schemas/` — Pydantic I/O, `app/core/config.py` — ustawienia
- Ruff: line-length 100, reguły `E,F,I,B,UP`; pytest z `asyncio_mode=auto`

### Frontend
`src/api/` (klient HTTP), `src/components/`, `src/pages/`, `src/hooks/`, `src/types/`, `src/styles/`.

### Komendy
```bash
cp .env.example .env && docker compose up --build     # front :8080, API :8000/docs, PG :5432
cd frontend && VITE_API_URL=http://localhost:8000/api/v1 npm run dev   # HMR :5173
docker compose exec backend alembic revision --autogenerate -m "opis"
docker compose exec backend alembic upgrade head
docker compose exec backend pytest
docker compose exec backend ruff check .
cd frontend && npm run lint && npm run build
```

---

## Ekrany (30 w 8 grupach)

| # | Ekran | Moduł | Dla kogo |
|---|---|---|---|
| 1 | Strona główna (3 ścieżki: mam problem / mam pomysł / szukam wiedzy; wyszukiwarka) | Wspólne | Wszyscy |
| 2 | Logowanie i wybór roli | Wspólne | Wszyscy |
| 3 | Mój pulpit | Wspólne | Zalogowani |
| 4 | Opisz problem | I | Mieszkańcy, NGO, JST |
| 5 | Rozmowa doprecyzowująca | I | Mieszkańcy, NGO, JST |
| 6 | Twój problem w skrócie | I | Mieszkańcy, NGO, JST |
| 7 | Wyniki dopasowania (rozwiązania / podobne przypadki / ludzie) | I | Mieszkańcy, NGO, JST |
| 8 | Tryb asystowany | I | CUS, sołtys |
| 9 | Kondycja Małopolski | II | Wszyscy |
| 10 | Biblioteka Innowacji | II | Wszyscy |
| 11 | Karta innowacji | II | Wszyscy |
| 12 | Zapytaj bazę wiedzy | II | Wszyscy |
| 13 | Materiały edukacyjne | II | Wszyscy |
| 14 | Nowa fiszka pomysłu | III | NGO, innowatorzy |
| 15 | Podgląd fiszki | III | NGO, innowatorzy |
| 16 | Lista naborów | III | NGO, innowatorzy |
| 17 | Generator wniosku | III | NGO, innowatorzy |
| 18 | Katalog testów | IV | Wszyscy |
| 19 | Feedback po teście | IV | Testujący |
| 20 | Wyniki testów | IV | Innowatorzy |
| 21 | Wiadomości | V | Zalogowani |
| 22 | Zapytaj ROPS | V | Wszyscy |
| 23 | Eksperci | V | Wszyscy |
| 24 | Szukam partnera | V | JST, NGO, eksperci |
| 25 | Mapa Małopolski | VI | ROPS |
| 26 | Zgłoszenia i rozmowy | VI | ROPS |
| 27 | Moderacja i treści (+ ew. użytkownicy i role) | VI | ROPS |
| 28 | Nabory (konfiguracja) | VI | ROPS |
| 29 | Trendy i analityka | VI | ROPS |
| 30 | Dopasuj do mojej gminy | VII | JST |

Pasek dostępności i tryb ETR — na każdym ekranie.

---

## Scenariusze demo

Na start: 10 s wpisywania głosem + tryb ETR.
1. **JST (główny):** urzędniczka opisuje głosem problem samotnych seniorów bez transportu → rozmowa doprecyzowująca + dane gminy ujawniają, że przyczyną jest izolacja, nie transport → wyniki: 2 innowacje ROPS, podobne zgłoszenie z innej gminy, ekspert → „Dopasuj do mojej gminy” (plan usługi dla CUS z budżetem w przedziałach) → „Zapytaj eksperta” (wątek przypięty do zgłoszenia).
2. **NGO/innowator:** kanwa z asystentem (wskazuje podobną innowację, kontakt z autorem) → fiszka → generator wniosku do naboru z samooceną → zgłoszenie do testów + przykładowy feedback.
3. **ROPS:** mapa z nowym zgłoszeniem → odpowiedź ze szkicu AI → dodanie dokumentu i zatwierdzenie szkicu karty → trendy i białe plamy.

---

## Otwarte pytania do mentorów

- [ ] Czy jest szablon regulaminu i formularza naboru grantowego ROPS?
- [ ] Jaki standard karty usługi społecznej stosują CUS?
- [ ] Które innowacje mają dane o kosztach i efektach z pilotaży?
- [ ] W jakim formacie są dane Mapy Wyzwań i czy obejmują poziom gmin?
- [ ] Czy filmy o innowacjach można osadzać z obecnych źródeł?

---

## Stan implementacji

| Obszar | Status |
|---|---|
| Boilerplate (Docker, FastAPI, React, Alembic, przykładowy model `Item`, `/health`) | ✅ gotowe |
| Wspólny model danych (obiekty + kategorie) | ⬜ do zrobienia |
| pgvector w obrazie Postgresa | ⬜ do zrobienia |
| Warstwa pośrednia LLM | ⬜ do zrobienia |
| I. Matchmaking (+ zbiór testowy 30–50 par) | ⬜ |
| II. Zasobnik wiedzy | ⬜ |
| III. Kreator pomysłów | ⬜ |
| IV. Tester innowacji | ⬜ |
| V. Komunikacja | ⬜ |
| VI. Panel administratora | ⬜ |
| VII. Middleman innowacji | ⬜ |
| Warstwa dostępności (pasek, ETR, aria-live) | ⬜ |
| Materiały: pitch deck, nagranie demo, audyt axe/Lighthouse/NVDA | ⬜ |

Legenda: ⬜ nie zaczęte · 🟨 w toku · ✅ gotowe

---

## Dziennik zmian

Najnowsze na górze. Format: `RRRR-MM-DD · hash · opis`.

- 2026-10-03 · niecommitowane · Dodano CLAUDE.md na podstawie dokumentu koncepcji Splot (kontekst, moduły, model danych, ekrany, demo, zasada prowadzenia dziennika).
- 2026-10-03 · 72cd377 · Boilerplate monorepo: FastAPI + PostgreSQL + Alembic (backend), React + Vite + TS (frontend), docker-compose.
- 2026-10-03 · 4da3f47 · Initial commit.
