# 0003. Zasobnik wiedzy (moduł II)

- Status: todo
- Osoba: 

## Cel

Publiczny katalog Biblioteki Innowacji pod `/zasobnik`: przeglądanie, filtrowanie i strona innowacji z filmem i materiałami. To moduł II z [kryteriów](../kryteria-oceny.md), za który jest +5%. Musi spełniać WCAG 2.1 AA.

## Założenia

- Dane: `assets/innowacje-spoleczne/*.json` (115 innowacji, 9 kategorii), format opisany w [baza-innowacji.md](../baza-innowacji.md). Docelowo dane trafią do Postgresa, więc dostęp do nich trzymamy w repozytorium. Po zmianie źródła wymieniamy tylko repozytorium.
- Bez logowania. Trendy potrzeb dla administratora nie wchodzą w zakres tego zadania.
- Strona innowacji jest wspólna z czatem (krok 7 w [DEMO.md](../DEMO.md)). Kto ją robi, ustalcie z osobą od demo.
- Pliki JSON są poza `backend/`, a kontener backendu montuje tylko `./backend`.

## Kroki

Backend
- [ ] W `docker-compose.yml` zamontować `./assets:/assets:ro` i dodać ścieżkę do `core/config.py`
- [ ] `InnowacjaRepository` czyta JSON przy starcie, metody: `list(kategoria, q, wybrane)`, `get(slug)`, `kategorie()`
- [ ] Service i endpointy: `GET /api/v1/innowacje`, `GET /api/v1/innowacje/{slug}`, `GET /api/v1/kategorie`
- [ ] Testy endpointów

Frontend
- [ ] `/zasobnik`: kafle kategorii z liczbą innowacji, wyszukiwarka tekstowa, filtr „wybrane do upowszechniania”
- [ ] Karta innowacji: obraz, nazwa, kategoria, skrót problemu
- [ ] `/innowacje/:slug`: opis, problem, grupa docelowa, kto może skorzystać, czy działa, osadzony film, PDF, ZIP, licencja i link do źródła ROPS. Puste pola obsłużyć zgodnie z baza-innowacji.md
- [ ] Link do zasobnika w `Layout`
- [ ] Dostępność: nawigacja klawiaturą, `alt` dla obrazów, tytuł `iframe` z filmem, audyt axe

Później (osobne zadania)
- [ ] Wyzwania Małopolski (raporty, Mapa Wyzwań Społecznych) i materiały edukacyjne. Najpierw trzeba ustalić źródło danych, bo w repo go nie ma.
- [ ] Trendy potrzeb dla administratora (zależy od panelu admina i zapisu potrzeb)

## Notatki

- Pole `organizacja` może zawierać nazwisko. Przed demem sprawdzić je ręcznie.
