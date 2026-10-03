# Splot: co mamy i jak wygrać

Stan na 2026-10-04, noc przed oddaniem (termin 11:00). Szczegóły: [status.md](status.md), kryteria: [kryteria-oceny.md](kryteria-oceny.md).

## Co jest w projekcie

| Moduł | Co działa |
|---|---|
| I. Matchmaking (obowiązkowy) | Rozmowa zamiast formularza, panel „Twój problem”, maks. kilka trafień z uzasadnieniem i źródłem ROPS, dane gminy z Obserwatora, brak dopasowania → „Zgłoś potrzebę” z gotowym opisem |
| II. Zasobnik wiedzy | 115 innowacji (filtry, filmy, materiały), 51 raportów, publikacje, Mapa Wyzwań, 184 wskaźniki Obserwatora, wersja tekstowa każdego PDF |
| III. Kreator pomysłów | Fiszka z AI i dyktowaniem, nabory jako dane, generator wniosku (DOCX), „Znajdź finansowanie”, canva, asystent |
| IV. Tester innowacji | Oceny i zgłoszenia do testów, moderacja ROPS, poziom dowodu: opisane → w testach → sprawdzone |
| V. Komunikacja | Wątek zgłoszenia bez konta (`/watek/:token`), odpowiedź pracownika ROPS, e-mail. **Najsłabszy moduł** |
| VI. Panel administratora | Skrzynka z triażem AI i licznikiem czasu, powiadomienia, „wgraj dokument → karta”, edycja kart, radar trendów, nabory, moderacja opinii |
| VII. Middleman | Karta wdrożenia pod rolę instytucji, druk, „Chcę to wdrożyć” do skrzynki ROPS |

Pod spodem: FastAPI + Postgres + React, Docker Compose, DeepSeek za warstwą LLM, limity zapytań (nginx), WCAG: pasek dostępności (3 rozmiary, 3 motywy), axe 0 naruszeń na wszystkich stronach.

## Pomysły na przewagę

Kolejność według stosunku punktów do czasu. Wszystko bez wymyślania danych: AI tylko przepisuje i dopasowuje bazę ROPS.

### Szybkie (do 1–2 h), duży efekt na jury

1. **Tryb prostego języka (ETR) jednym przyciskiem.** Na karcie innowacji „Powiedz prościej”: AI przepisuje opis na krótkie zdania, bez żargonu, ze źródłem. Brief wymaga ETR, a w bazie ROPS jest nawet innowacja „Konsultant ETR”. Trafia w 20% za dostępność.
2. **Czytanie na głos.** Przycisk „Przeczytaj” przy karcie i odpowiedzi czatu (Web Speech API, za darmo, bez serwera). Mamy dyktowanie, brakuje drugiej strony. Senior słyszy, nie musi czytać.
3. **Deklaracja dostępności i raport axe w aplikacji** (`/dostepnosc`). Podmioty publiczne mają taki obowiązek. Pokazuje, że znamy świat ROPS, i daje gotowy slajd.
4. **„Ile to kosztuje ROPS” jako strona,** nie tylko slajd. Trzy warianty (pilot, region, rozbudowa), podział jednorazowo/rocznie, suwak liczby wyszukiwań. Trafia w 20% za potencjał wdrożeniowy.
5. **Liczba na slajd: trafność dopasowania.** Puścić `backend/scripts/eval_matchmaking.py` na zestawie testowym (też potoczne zdania i literówki) i podać „trafna innowacja w top-3 w X% przypadków”. Jury będzie to sprawdzać ręcznie, a my pokażemy, że mierzymy.

### Średnie (2–4 h), domykają moduły

6. **„Połącz z kimś, kto to już robi” (moduł V).** Z Testera wiemy, które instytucje testują daną innowację. Przycisk „Zapytaj instytucję, która to wdrożyła”: wiadomość idzie przez ROPS jako pośrednika (bez ujawniania kontaktów). Partnerstwa międzysektorowe z briefu bez budowania czatu od zera.
7. **Dyżur eksperta (moduł V).** W wątku zgłoszenia przycisk „Poproś mentora”; admin przypisuje mentora z listy i odpowiada w tym samym wątku. Mała zmiana w modelu, a moduł przestaje być „tylko skrzynką”.
8. **Obserwuj potrzebę.** Gdy nie ma dopasowania, użytkownik zostawia e-mail. Gdy admin doda kartę, która pasuje do tej potrzeby (radar już grupuje), system wysyła powiadomienie. Domyka pętlę „potrzeba → nowa innowacja” i jest świetną historią do filmu.
9. **Jednostronicowy PDF „dla dyrektora”.** Karta innowacji + karta wdrożenia + nabór w jednym pliku do wydruku. Dyrektorka szkoły z demo idzie z tym do organu prowadzącego.

### Większe (na roadmapę w prezentacji, nie na dziś)

10. **Mapa Małopolski dla ROPS.** Gminy kolorowane według niedopasowanych potrzeb (radar) i wdrożeń (Tester), na danych Obserwatora. „Gdzie brakuje rozwiązań” w jednym widoku: to jest „nowa jakość” dla zamawiającego.
11. **Miesięczny raport dla ROPS jednym kliknięciem:** liczba zgłoszeń, czas odpowiedzi, top potrzeb, nowe karty. Argument o prostocie utrzymania.
12. **Profil zaufany i konta instytucji** jako etap 2 wdrożenia (dziś działamy bez kont, tokenem w adresie).

## Rekomendacja na dziś

Do 8:00: punkty **1, 2, 3, 5** (dostępność + mierzalna trafność), jeśli starczy rąk: **6** (najsłabszy moduł). Potem stop funkcjom: stabilne demo, film, PDF, wysyłka przed 11:00.
