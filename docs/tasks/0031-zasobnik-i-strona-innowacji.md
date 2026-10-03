# 0031. Zasobnik wiedzy, strona innowacji i dokumenty

- Status: todo
- Osoba: 
- PR: 

## Cel

Zasobnik wygląda jak regionalna biblioteka wiedzy: łatwo przejrzeć 115 innowacji, raporty i wskaźniki, a karta innowacji od razu mówi, czego dotyczy, co można pobrać i jak wdrożyć. Filtry w adresie, wyszukiwanie i działy zostają.

## Kroki

### Lista

- [ ] Usunąć poświaty `--zs-glow-*` (fiolet i błękit) z `zasobnik.css`, zastąpić tłem z 0027.
- [ ] Kategorie z ikonami (seniorzy, niepełnosprawność sensoryczna, mobilność itd.), jedna ikona na kategorię wspólna z czatem i stroną innowacji.
- [ ] Karta innowacji (`InnowacjaCard.tsx`): ikona kategorii, nazwa, problem (maks. 3 linie z „więcej” na stronie szczegółów), znaczniki dostępnych materiałów (film, PDF, ZIP) i „Polecana przez ROPS”. Cała karta klikalna jednym linkiem (nazwa), bez zagnieżdżonych linków.
- [ ] Sortowanie: alfabetycznie, najpierw polecane przez ROPS. Parametr w adresie jak pozostałe filtry.
- [ ] Szkielety kart podczas ładowania zamiast „Wczytywanie…”, bez skoku układu.
- [ ] Działy „Innowacje / Wyzwania i raporty / Wskaźniki” jako wyraźne zakładki z ikonami.

### Wyzwania i wskaźniki

- [ ] Raporty jako lista z typem pliku, rokiem i licencją. „Wersja tekstowa” jako drugi przycisk.
- [ ] Wskaźniki: liczby czcionką tabelaryczną, rok i źródło przy każdej wartości. Jeśli są wykresy, to z tabelą alternatywną.

### Strona innowacji (`InnovationPage.tsx`)

- [ ] Nagłówek z kategorią, nazwą, organizacją i etykietą ROPS. Pod nim pasek akcji: „Pobierz materiały”, „Film”, „Wdróż u siebie” (karta usługi, moduł VII).
- [ ] Bok przyklejony (`position: sticky`) na desktopie: materiały, kontakt, licencja.
- [ ] Sekcje („Na czym polega”, „Jakich problemów dotyczy”…) z ikonami i spisem treści przy długich opisach.
- [ ] Film: podgląd z przyciskiem odtwarzania (ładowanie YouTube dopiero po kliknięciu, mniej zapytań i lepsza prywatność).
- [ ] Linki powrotu zostają (zasobnik z filtrami, wyniki czatu, strona główna). Strzałka jako ikona.

### Dokument (`DocumentPage.tsx`)

- [ ] Wersja tekstowa PDF: szerokość tekstu 65–75 znaków, spis treści, przycisk „Pobierz oryginał”.

## Notatki

- Zależy od 0026–0028.
- Obraz w rekordach to kod QR, nie ilustracja (komentarz w `InnowacjaCard.tsx`). Nie pokazujemy go jako zdjęcia.
- Licencja przy każdej pozycji zostaje (`docs/jury/README.md`, sekcja o licencjach).
