# 0033. Panel administratora: układ i czytelność

- Status: todo
- Osoba: 
- PR: 

## Cel

Pracownik ROPS po zalogowaniu widzi, co wymaga działania, i szybko przechodzi między skrzynką, kartami, importami, radarem, naborami i opiniami. Panel wygląda jak narzędzie pracy, spójne z motywem Małopolska. Wszystkie obecne funkcje zostają.

## Kroki

- [ ] Ekran logowania (`AdminLayout.tsx`): karta na środku ze znakiem Splotu i dopiskiem „Panel pracownika ROPS”, przycisk pokazania tokenu.
- [ ] Nawigacja panelu: na desktopie (≥ 64rem) boczna kolumna z ikonami i licznikami (nieprzeczytane powiadomienia, nowe zgłoszenia), na mobile zakładki przewijane albo menu. „Wyloguj” oddzielony od nawigacji.
- [ ] Skrzynka (`InboxPage.tsx`): u góry liczniki (nowe, w trakcie, po terminie), filtry jako chipy z 0028. Tabela na mobile zamienia się w listę kart zamiast przewijania w bok (`min-width: 44rem` w `admin.css`).
- [ ] Statusy i pilność: etykiety z ikoną i kolorem z tokenów (`StatusBadge`, `UrgencyBadge` w `admin/ui.tsx`). Licznik czasu odpowiedzi wyróżniony, gdy przekroczony.
- [ ] Zgłoszenie (`TicketPage.tsx`): dwie kolumny (treść i wątek | triaż AI, status, akcje). Sugestia AI oznaczona jako sugestia.
- [ ] Radar (`RadarPage.tsx`): wykres słupkowy z osiami i etykietami, kolory z tokenów, tabela z danymi pod wykresem (dziś słupki mają `aria-hidden`, sprawdzić, czy jest odpowiednik tekstowy). Pusty stan z opisem.
- [ ] Edycja karty i import: formularze z 0028, podgląd karty tak, jak zobaczy ją mieszkaniec, potwierdzenie przed publikacją i odrzuceniem.
- [ ] Toast „Zapisano” (`aria-live="polite"`, znika po kilku sekundach) po zapisie karty, naboru i moderacji.

## Notatki

- Zależy od 0026–0028.
- Kontrola dostępu zostaje na backendzie. Nie zmieniamy `admin/api.ts`.
- Panel też podlega WCAG (skrypt axe z 0022 obejmuje trasy panelu).
