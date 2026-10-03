# Splot – pierwsze demo: matchmaking w rozmowie

Cel: użytkownik bez logowania opisuje problem w czacie. AI ustala jego rolę, doprecyzowuje problem i zwraca do 5 dopasowanych innowacji z wyjaśnieniem, jak każdy wynik ma się do problemu.

## Przepływ

1. **Strona główna:** hero + pole czatu, pod nim 3–4 przykładowe opisy problemów do kliknięcia.
2. **Rola:** AI analizuje pierwszą wiadomość i nadaje rolę (mieszkaniec, JST, NGO, pracownik CUS/OPS, ekspert - osoba pracująca nad backendem ustala jakie są role). Rola jest widoczna w czacie z przyciskiem „Zmień”.
3. **Doprecyzowanie:** maksymalnie 3–4 rundy pytań. Każde pytanie ma odpowiedzi do kliknięcia i opcję „inne”, gdzie użytkownik sam wpisuje odpowiedź. Inspiracja z tego jak Claude zadaje pytanie w chat'cie.
4. **Panel „Twój problem”:** obok czatu, wypełnia się na bieżąco w trakcie rozmowy.
5. **Podsumowanie:** przed wyszukiwaniem użytkownik potwierdza lub poprawia podsumowanie problemu.
6. **Wyniki:** do 5 kart pod rozmową. Przycisk „Pokaż wyniki teraz” jest dostępny przez cały czas.
7. **Szczegóły:** kliknięcie karty otwiera stronę z pełnym opisem, materiałami i kontaktem do autora.

Gdy nic nie pasuje, AI mówi to wprost i pokazuje najbliższe wyniki z informacją, czym się różnią.

## Układ ekranu

```
┌──────────────────────────────────────────────┐
│ HERO: Splot – opisz problem, znajdź rozwiązanie │
├──────────────────────────────┬───────────────┤
│ Czat                         │ Twój problem  │
│  [rola: JST · Zmień]         │ Kogo dotyczy  │
│  pytanie + [opcje do klik.]  │ Gdzie (gmina) │
│  ...                         │ Skala         │
│  [Pokaż wyniki teraz]        │ Przyczyna     │
│  [pole tekstowe] [🎤]        │ Co próbowano  │
│                              │ Zasoby        │
├──────────────────────────────┴───────────────┤
│ Wyniki: karty 1–5                             │
└──────────────────────────────────────────────┘
```

Na wąskim ekranie panel „Twój problem” zwija się nad czatem.

## Podział odpowiedzialności

**Frontend (React)**
- Przechowuje całą rozmowę i stan problemu **tylko po stronie przeglądarki** (stan aplikacji, bez zapisu na backendzie).
- Przy każdej wiadomości wysyła do backendu pełną historię i aktualny stan problemu.
- Odbiera strumień zdarzeń (SSE) i renderuje je jako komponenty: tekst, rola, pytanie z opcjami, aktualizacja panelu, karty wyników.
- Odpowiada za dostępność (sekcja niżej).

**Backend (FastAPI)**
- Jest bezstanowy: nie zapisuje rozmów.
- Prowadzi model AI z narzędziami (tool calling) i przesyła wynik jako strumień zdarzeń.
- Wyszukuje w aktualnych plikach jakie mamy.
- Udostępnia szczegóły pozycji z bazy.

## API

## Narzędzia modelu (backend) - propozycja do potwierdzenia przez osobę pracującą nad backendem

| Narzędzie | Zdarzenie | Kiedy |
|---|---|---|
| `set_role(role)` | `role` | po pierwszej wiadomości lub zmianie roli |
| `update_problem(fields)` | `problem_update` | gdy z rozmowy wynika nowa informacja |
| `ask_question(text, options)` | `question` | gdy brakuje informacji z listy pól |
| `propose_summary()` | `summary` | gdy pola są wypełnione albo minął limit rund |
| `search(problem)` | `results` | po potwierdzeniu podsumowania lub po `show_results_now` |

**Reguły dla modelu:**
- Pyta tylko o brakujące pola, maksymalnie 3–4 rundy.
- Rola wpływa na sposób formułowania pytań i kolejność wyników.
- `why_relevant` opiera się wyłącznie na danych z karty pozycji. Model nie podaje kontaktów, liczb ani faktów spoza bazy.

## Dostępność (WCAG 2.1 AA)

- Pełna obsługa klawiaturą, widoczny fokus.
- Nowe wiadomości ogłaszane czytnikom ekranu (`aria-live="polite"`).
- Opcje do kliknięcia to prawdziwe przyciski z etykietami.
- Kontrast minimum 4.5:1, możliwość powiększenia tekstu do 200% bez utraty treści.
- Panel „Twój problem” ma nagłówki i jest czytelny bez czatu.

## Kryteria gotowości demo

- [ ] Trzy scenariusze przechodzą od początku do końca: wójt (samotni seniorzy), mieszkaniec, NGO.
- [ ] Rola jest wykrywana poprawnie i da się ją zmienić.
- [ ] Panel „Twój problem” aktualizuje się w trakcie rozmowy.
- [ ] Wyniki pojawiają się po maksymalnie 4 rundach pytań; „Pokaż wyniki teraz” działa w każdej chwili.
- [ ] Każda karta ma sensowne `why_relevant`, a strona szczegółów pokazuje kontakt z bazy.
- [ ] Odpowiedzi są strumieniowane, bez kilkusekundowej ciszy.
- [ ] Brak dopasowania jest obsłużony uczciwie.
- [ ] Audyt axe bez błędów krytycznych.

## Poza zakresem pierwszego demo

Logowanie, zapis rozmów na backendzie, panel ROPS, kreator pomysłów, tester, komunikacja, PJM i audio. Karty wyników projektujemy tak, aby te moduły można było później podpiąć jako akcje.

## Ustalenia o zakresie

- Dodatkowy moduł (+5%): VII Middleman innowacji, karta usługi dla CUS/OPS i partnera na stronie innowacji.
- Dane gminy z pola „Gdzie” z Obserwatora Statystyk są w demo (np. „w Twojej gminie…”).
- Wejście głosowe (🎤) jest w demo.
