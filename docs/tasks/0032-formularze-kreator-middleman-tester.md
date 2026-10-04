# 0032. Kreator pomysłów, Middleman, Tester, zgłoszenia i wątek

- Status: todo
- Osoba: 
- PR: 

## Cel

Wszystkie formularze dla mieszkańców i instytucji (fiszka, wniosek, canva, finansowanie, karta usługi, oceny i testy, zgłoszenie potrzeby, wątek) mają jeden wygląd i są przyjazne dla osób o małych umiejętnościach cyfrowych. Autozapis, kroki, druk i AI działają jak dziś.

## Kroki

### Kreator pomysłów

- [ ] `KreatorHome.tsx`: kafle z dużą ikoną i jednym zdaniem. Stan naboru jako etykieta („Trwa nabór do 12.11” / „Brak naboru”). Sekcja „Twoje szkice” jako lista kart z datą i typem.
- [ ] Fiszka: krokomierz z nazwami kroków (dziś pasek i tekst „Krok X z Y” w `kreator/components.tsx`), możliwość powrotu do kroku przez kliknięcie. Widoczny stan autozapisu („Zapisano 12:04”) w stałym miejscu.
- [ ] Przycisk AI („Wypełnij z opisu”) z ikoną i opisem, co zrobi. Wyniki AI oznaczone jako propozycja do sprawdzenia.
- [ ] Canva: plansza jako siatka pól w kolorach motywu, czytelna na A4 poziomo, z nagłówkiem Splotu przy druku.
- [ ] Wniosek (DOCX): podgląd sekcji przed pobraniem, przycisk pobrania z rozmiarem i formatem pliku.

### Middleman (`ServiceCardPage.tsx`)

- [ ] Wybór roli instytucji jako duże kafle z ikonami, nie lista opcji.
- [ ] Wygenerowana karta wdrożenia jako dokument: nagłówek z nazwą innowacji i instytucji, sekcje z ikonami, etykieta „Przygotowane przez AI na podstawie danych ROPS”.
- [ ] Druk: wzór jak pismo urzędowe (nagłówek Splotu, data, źródło). `@media print` w `service-card.css` przepisać na tokeny.
- [ ] Ładowanie generowania: kroki postępu („Czytam opis innowacji… Dopasowuję do instytucji…”) zamiast samego „To potrwa kilka sekund”.

### Tester (`TesterSection.tsx`)

- [ ] Ocena gwiazdkami lub skalą z dużymi przyciskami (radio z etykietami), poziom dowodu (opisane → w testach → sprawdzone) jako oś z zaznaczonym etapem.

### Zgłoszenie i wątek

- [ ] `ReportPage.tsx`: formularz w karcie, wstępnie wypełniona treść z czatu wyraźnie oznaczona. Ekran podziękowania z ilustracją, linkiem do wątku i przyciskiem „Skopiuj link”.
- [ ] `ThreadPage.tsx`: status zgłoszenia jako etykieta. Dymki z rolą i datą są już z 0039; do weryfikacji, czy etykieta statusu jest.

### Wspólne

- [ ] Wszystkie formularze używają pól z 0028: etykieta, podpowiedź, błąd pod polem, po wysłaniu z błędami fokus na pierwszym błędnym polu i podsumowanie błędów u góry.
- [ ] `autocomplete` i typy pól (`email`, `tel`) wszędzie, gdzie pasują.
- [ ] Przyciski wysyłki ze stanem ładowania i komunikatem sukcesu w `role="status"`.

## Notatki

- Zależy od 0026–0028.
- Nie zmieniamy API ani walidacji backendu.
