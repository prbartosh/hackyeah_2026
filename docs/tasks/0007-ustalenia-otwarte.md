# 0007. Ustalenia otwarte

- Status: zrobione
- Osoba: Nikodem, Wiktor

## Cel

Rozstrzygnąć decyzje, które blokują inne zadania. Każde ustalenie wpisać w odpowiedni plik (ADR, zadanie, CLAUDE.md) i odhaczyć tutaj. Decyzje techniczne uzgadniacie z osobą, której dotyczą (w nawiasach).

## Do ustalenia

Zespół i odpowiedzialność
- [x] Wasze obszary (Nikodem, Wiktor) do tabeli „Zespół” w [CLAUDE.md](../../CLAUDE.md): produkt i demo, razem
- [x] Kto robi [zadanie 0005](0005-slownik-i-nakladka.md) (słownik i nakładka): Bartłomiej
- [x] Kto zatwierdza słownik startowy, nakładkę i powiązania dokument ↔ innowacja ([ADR 0004](../adr/0004-obiekt-innowacji.md), otwarta kwestia 1): Bartłomiej

Zakres demo
- [x] Dodatkowy moduł (+5%): VII Middleman innowacji potwierdzony. Uzasadnienie pod [kryteria oceny](../kryteria-oceny.md): +5% za kolejny moduł, pasuje do ról CUS/OPS i partner, wykorzystuje ten sam model i dane innowacji (niski koszt, potencjał wdrożeniowy)
- [x] Obserwator Statystyk w czacie: dane gminy z pola „Gdzie” są w demo (zapisane w [DEMO.md](../DEMO.md)). Wymaga mapowania gminy na wskaźniki i narzędzia modelu
- [x] Dostępność poza WCAG: wejście głosowe (🎤) robimy. PJM i audio poza demo

Limity i koszty ([zadanie 0006](0006-limity-czatu.md), Bartłomiej)
- [x] Zatwierdzić albo zmienić wartości z tabel w 0006: zatwierdzone bez zmian
- [x] Kto ma dostęp do panelu OpenAI i ustawia limit budżetu oraz alert: Nikodem

Potrzeby ([zadanie 0004](0004-zapis-potrzeb.md), Bartłomiej)
- [x] Retencja zapisów potrzeb: do końca demo/hackathonu
- [x] Kto widzi trendy potrzeb: poza demo, później rola ROPS z logowaniem

Jakość dopasowania
- [x] Zestaw testowy: 28 zgłoszeń w [zestaw-testowy.md](../zestaw-testowy.md) (rola, oczekiwany `slug`, jedno „brak dopasowania”)
- [x] Przegląd pola `organizacja` w 115 rekordach pod kątem nazwisk. Lista dla Bartłomieja (poprawki robi backend w `InnovationRepository`, nie frontend i nie `innowacje.json`): `sciezka-motosensoryczna`, `bez-presji-z-depresji` (nazwa firmy z imieniem i nazwiskiem). Nazwy z „im.” (patroni instytucji) uznane za bezpieczne

## Poza zakresem

- „Podobne przypadki” (moduł I) projektujemy osobno.
- Zasobnik wiedzy (osobna aplikacja czy `frontend/`, trasa strony innowacji, endpoint, tokeny): ustalone w [komentarzu do PR #9](https://github.com/prbartosh/hackyeah_2026/pull/9), czekamy na poprawki.
