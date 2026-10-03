# 0007. Ustalenia otwarte

- Status: todo
- Osoba: Nikodem, Wiktor

## Cel

Rozstrzygnąć decyzje, które blokują inne zadania. Każde ustalenie wpisać w odpowiedni plik (ADR, zadanie, CLAUDE.md) i odhaczyć tutaj. Decyzje techniczne uzgadniacie z osobą, której dotyczą (w nawiasach).

## Do ustalenia

Zespół i odpowiedzialność
- [ ] Wasze obszary (Nikodem, Wiktor) do tabeli „Zespół” w [CLAUDE.md](../../CLAUDE.md)
- [ ] Kto robi [zadanie 0005](0005-slownik-i-nakladka.md) (słownik i nakładka)
- [ ] Kto zatwierdza słownik startowy, nakładkę i powiązania dokument ↔ innowacja ([ADR 0004](../adr/0004-obiekt-innowacji.md), otwarta kwestia 1)

Zakres demo
- [ ] Dodatkowy moduł (+5%): potwierdzić „VII Middleman innowacji” (karta usługi dla CUS/OPS i partnera na stronie innowacji) albo wybrać inny. Krótkie uzasadnienie pod [kryteria oceny](../kryteria-oceny.md)
- [ ] Obserwator Statystyk w czacie: czy demo pokazuje dane gminy z pola „Gdzie” (np. „w Twojej gminie...”), czy zostaje poza zakresem, jak w [DEMO.md](../DEMO.md)
- [ ] Dostępność poza WCAG: wejście głosowe (🎤 w makiecie DEMO.md) robimy czy usuwamy z makiety. Czy PJM i audio wchodzą do demo

Limity i koszty ([zadanie 0006](0006-limity-czatu.md), Bartłomiej)
- [ ] Zatwierdzić albo zmienić wartości z tabel w 0006
- [ ] Kto ma dostęp do panelu OpenAI i ustawia limit budżetu oraz alert

Potrzeby ([zadanie 0004](0004-zapis-potrzeb.md), Bartłomiej)
- [ ] Retencja zapisów potrzeb (jak długo trzymamy)
- [ ] Kto widzi trendy potrzeb (panel admina: rola, logowanie)

Jakość dopasowania
- [ ] Zestaw testowy: 20–30 zgłoszeń napisanych jak przez użytkownika, każde z rolą i oczekiwanym `slug` wyniku głównego. Plik `docs/zestaw-testowy.md`. Wzór: [user_scenario.md](../../user_scenario.md) i scenariusze z DEMO.md (wójt, mieszkaniec, NGO)
- [ ] Dokończyć ręczne sprawdzenie pola `organizacja` w 115 rekordach pod kątem nazwisk (`sciezka-motosensoryczna` już znalezione w PR #9). Listę slugów z nazwiskami przekazać Bartłomiejowi: poprawki robi backend (`InnovationRepository`), nie frontend i nie `innowacje.json` (ustalenie z [komentarza w PR #9](https://github.com/prbartosh/hackyeah_2026/pull/9))

## Poza zakresem

- „Podobne przypadki” (moduł I) projektujemy osobno.
- Zasobnik wiedzy (osobna aplikacja czy `frontend/`, trasa strony innowacji, endpoint, tokeny): ustalone w [komentarzu do PR #9](https://github.com/prbartosh/hackyeah_2026/pull/9), czekamy na poprawki.
