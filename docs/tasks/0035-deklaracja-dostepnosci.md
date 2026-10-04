# 0035. Deklaracja dostępności (`/dostepnosc`)

- Status: review
- Osoba: Nikodem
- PR: #55

## Cel

Strona z deklaracją dostępności według wzoru z ustawy z 4 kwietnia 2019 r., oparta wyłącznie na faktach z repo (axe, klawiatura, ułatwienia), z uczciwą informacją, że test NVDA jest w toku. Pomysł 3 z `docs/pomysly-na-przewage.md`.

## Kroki

- [x] Strona `AccessibilityPage` pod trasą `dostepnosc` (leniwie ładowana), `useDocumentTitle`
- [x] Sekcje wzoru deklaracji, pola bez danych w repo oznaczone „do uzupełnienia przez ROPS”
- [x] Tabela wyników axe jako stała w kodzie
- [x] Link „Deklaracja dostępności” w stopce
- [ ] Po teście NVDA (0022) zaktualizować status zgodności i sekcję „Jak sprawdzaliśmy”

## Notatki

- Tylko frontend. Dane z notatek zadań 0020 i 0022.
- Koordynator dostępności, telefon, termin odpowiedzi, data publikacji aplikacji, procedura skargowa i dostępność architektoniczna: do uzupełnienia przez ROPS.