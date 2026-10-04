# Splot: matchmaking w rozmowie

Użytkownik bez logowania opisuje problem w czacie. AI ustala rolę, doprecyzowuje problem i zwraca do 5 innowacji z uzasadnieniem. Aplikacja: `/`. Uruchomienie: [README](../README.md).

## Przepływ

1. **Strona główna:** hero, pole czatu, 3–4 przykładowe opisy do kliknięcia.
2. **Rola:** AI nadaje rolę po pierwszej wiadomości (mieszkaniec, pracownik CUS/OPS, partner). Rola jest widoczna z przyciskiem „Zmień”.
3. **Doprecyzowanie:** maksymalnie 4 rundy pytań. Każde ma odpowiedzi do kliknięcia i opcję „inne”.
4. **Panel „Twój problem”:** obok czatu, wypełnia się na bieżąco.
5. **Podsumowanie:** użytkownik potwierdza lub poprawia je przed wyszukiwaniem.
6. **Wyniki:** do 5 kart pod rozmową. „Pokaż wyniki teraz” działa przez cały czas.
7. **Szczegóły:** karta otwiera `/innowacja/:slug` z opisem, materiałami i źródłem.

Gdy nic nie pasuje, AI mówi to wprost, pokazuje najbliższe wyniki i opisuje różnice. Użytkownik może zapisać potrzebę.

Na wąskim ekranie panel „Twój problem” zwija się nad czatem.

## Podział odpowiedzialności

**Frontend** trzyma rozmowę i stan problemu tylko w przeglądarce. Przy każdej wiadomości wysyła backendowi historię i stan. Renderuje strumień zdarzeń (SSE).

**Backend** jest bezstanowy, nie zapisuje rozmów. Prowadzi model z narzędziami i streamuje zdarzenia ([ADR 0005](adr/0005-matchmaking-chat-llm.md)).

## Narzędzia modelu

| Narzędzie | Zdarzenie | Kiedy |
|---|---|---|
| `set_role(role)` | `role` | po pierwszej wiadomości lub zmianie roli |
| `update_problem(fields)` | `problem_update` | nowa informacja z rozmowy |
| `ask_question(text, options)` | `question` | brakuje informacji |
| `propose_summary()` | `summary` | pola wypełnione albo limit rund |
| `search(slugs)` | brak | zwraca pełne karty kandydatów |
| `show_results(items)` | `results` | po podsumowaniu lub „Pokaż wyniki teraz” |
| `gmina_stats(gmina)` | `gmina_stats` | użytkownik podał gminę w Małopolsce |
| (backend po `show_results`) | `similar_cases` | co najmniej 5 podobnych potrzeb ([ADR 0012](adr/0012-podobne-przypadki.md)) |

Reguły dla modelu:
- Pyta tylko o brakujące pola, najwyżej 4 rundy.
- Rola wpływa na pytania i kolejność wyników.
- `why_relevant` opiera się tylko na karcie innowacji. Model nie podaje kontaktów, liczb ani faktów spoza bazy.

## Dostępność (WCAG 2.1 AA)

- Pełna obsługa klawiaturą, widoczny fokus.
- Nowe wiadomości ogłaszane czytnikom (`aria-live="polite"`).
- Opcje to przyciski z etykietami.
- Kontrast min. 4.5:1, powiększenie tekstu do 200%.
- Panel „Twój problem” ma nagłówki i jest czytelny bez czatu.

## Kryteria gotowości

- [ ] Scenariusze przechodzą od początku do końca: wójt, mieszkaniec, NGO.
- [ ] Rola jest wykrywana i da się ją zmienić.
- [ ] Panel „Twój problem” aktualizuje się w rozmowie.
- [ ] Wyniki po maksymalnie 4 rundach.
- [ ] Karty mają sensowne `why_relevant`, szczegóły pokazują źródło.
- [ ] Odpowiedzi są strumieniowane.
- [ ] Brak dopasowania jest obsłużony uczciwie.
- [ ] Audyt axe bez błędów krytycznych.

## Poza zakresem

Logowanie, zapis rozmów, PJM i audio. Pozostałe moduły: [status.md](status.md).
