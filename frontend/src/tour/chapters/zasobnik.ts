import type { TourChapter, TourContext } from '@/tour/types'

const SZUKANE = 'seniorzy samotnosc'

interface DokumentWpis { id: string; typ: string; tytul: string }
interface Trafienie { dokument: DokumentWpis; strona: number | null }

// Pierwszy raport lub publikacja z trafieniem w treści (ta sama kolejność co w wynikach na stronie)
async function raportZTrafieniem(ctx: TourContext): Promise<string> {
  const trafienia = await ctx.api<Trafienie[]>(`/documents/search?q=${encodeURIComponent(SZUKANE)}&limit=20`)
  const t = trafienia.find((h) => h.dokument.typ === 'raport' || h.dokument.typ === 'publikacja') ?? trafienia[0]
  if (!t) throw new Error('Brak dokumentów w Zasobniku')
  return `/dokument/${t.dokument.id}${t.strona ? `#strona-${t.strona}` : ''}`
}

async function pierwszyDokument(ctx: TourContext, typ: string): Promise<string> {
  const lista = await ctx.api<DokumentWpis[]>(`/documents?typ=${typ}`)
  if (!lista[0]) throw new Error(`Brak dokumentów typu ${typ}`)
  return `/dokument/${lista[0].id}`
}

// Wskaźnik z tabelą powiat × rok: pomoc społeczna, a gdy jej nie ma, pierwszy z listy
async function wskaznik(ctx: TourContext): Promise<string> {
  const lista = await ctx.api<DokumentWpis[]>('/documents?typ=wskaznik')
  const w = lista.find((d) => /pomoc społeczna/i.test(d.tytul)) ?? lista[0]
  if (!w) throw new Error('Brak wskaźników w Zasobniku')
  return `/dokument/${w.id}`
}

const chapter: TourChapter = {
  id: 'zasobnik',
  title: 'Zasobnik wiedzy',
  module: 'Moduł II',
  summary: 'Biblioteka innowacji, raportów, Mapy Wyzwań i wskaźników z wyszukiwaniem w treści.',
  minutes: 4,
  steps: [
    {
      id: 'zasobnik.przeglad',
      route: '/zasobnik',
      target: 'zasobnik-dzialy',
      title: 'Biblioteka wiedzy ROPS',
      body: [
        'Zasobnik zbiera w jednym miejscu innowacje, raporty, Mapę Wyzwań i wskaźniki ROPS Kraków.',
        'Nie zaczynasz od zera: widzisz, co już działa w Małopolsce.',
      ],
      hint: 'Trzy zakładki to trzy działy: innowacje, wyzwania i raporty, wskaźniki.',
      tag: 'Moduł II · +5%',
      placement: 'bottom',
    },
    {
      id: 'zasobnik.kategorie',
      route: '/zasobnik',
      target: 'zasobnik-kategorie',
      title: 'Szukaj według grupy odbiorców',
      body: [
        'Każda innowacja ma jedną kategorię, np. dla seniorów albo dla rynku pracy. Przy kafelku widzisz, ile ich jest.',
        'To najszybsza droga, gdy wiesz, komu chcesz pomóc.',
      ],
      hint: 'Kliknij wybrany kafelek, a lista poniżej się zawęzi.',
      tag: 'Moduł II',
      placement: 'top',
    },
    {
      id: 'zasobnik.szukaj',
      route: '/zasobnik',
      target: 'zasobnik-szukaj',
      title: 'Wyszukiwarka innowacji',
      body: [
        'Wpisz słowo albo opisz problem. Szukamy w nazwie, problemie i opisie, bez względu na wielkość liter i polskie znaki.',
        'Przycisk „Wybrane przez ROPS” zostawia innowacje polecane do upowszechniania.',
      ],
      hint: 'Wpisz „samotnosc” i zobacz wyniki.',
      tag: 'Moduł II',
      placement: 'bottom',
      actions: [{ kind: 'fill', target: 'zasobnik-szukaj-pole', value: 'samotnosc' }],
    },
    {
      id: 'zasobnik.wyzwania',
      route: '/zasobnik?dzial=wyzwania',
      target: 'zasobnik-doc-szukaj',
      title: 'Wyzwania i raporty',
      body: [
        'To drugi dział: raporty, publikacje i Mapa Wyzwań ROPS. Jedno pole przeszukuje całą treść dokumentów, a także wskaźniki i innowacje.',
        'Zamiast czytać setki stron, wpisujesz hasło.',
      ],
      hint: 'Wpisz „seniorzy samotnosc”.',
      tag: 'Moduł II · szukanie w treści',
      placement: 'bottom',
      actions: [{ kind: 'fill', target: 'zasobnik-doc-szukaj-pole', value: SZUKANE }],
    },
    {
      id: 'zasobnik.fragment',
      target: 'zasobnik-fragment',
      title: 'Fragment z podświetleniem',
      body: [
        'Pod tytułem widzisz akapit, w którym padły Twoje słowa, z podświetleniem. Link prowadzi na właściwą stronę dokumentu.',
        'Od razu sprawdzisz, czy to ten raport.',
      ],
      hint: 'Kliknij „Otwórz stronę”, żeby przejść do dokumentu.',
      tag: 'Moduł II',
      placement: 'top',
      actions: [{ kind: 'fill', target: 'zasobnik-doc-szukaj-pole', value: SZUKANE }],
      waitFor: { target: 'zasobnik-fragment', timeoutMs: 15000, message: 'Szukam w treści dokumentów, pierwsze wyszukiwanie trwa chwilę. Wpisz hasło w pole wyżej.' },
    },
    {
      id: 'zasobnik.dokument',
      route: raportZTrafieniem,
      target: 'zasobnik-raport-naglowek',
      title: 'Dokument do czytania',
      body: [
        'Każdy raport ma wersję tekstową: czytelną na telefonie i dla czytnika ekranu, inaczej niż sam PDF.',
        'Oryginalny PDF jest pod przyciskiem „Otwórz PDF”.',
      ],
      hint: 'Zobacz przycisk „Otwórz PDF”, nie musisz go klikać.',
      tag: 'Dostępność',
      placement: 'bottom',
    },
    {
      id: 'zasobnik.czytanie',
      target: 'zasobnik-raport-szukaj',
      title: 'Szukanie w dokumencie',
      body: [
        'Pole szuka w całym raporcie i podświetla trafienia. Strzałkami przeskakujesz między nimi.',
        'Spis treści poniżej pomaga dojść do rozdziału bez przewijania.',
      ],
      hint: 'Wpisz „senior” i przejdź do następnego trafienia.',
      tag: 'Dostępność',
      placement: 'right',
      actions: [{ kind: 'fill', target: 'zasobnik-raport-szukaj-pole', value: 'senior' }],
    },
    {
      id: 'zasobnik.licencja',
      target: 'zasobnik-raport-licencja',
      title: 'Licencja i źródło',
      body: [
        'Licencję pokazujemy tylko tam, gdzie podaje ją ROPS, np. CC BY 4.0. Niczego nie dopisujemy.',
        'Gdy licencji brak, wiesz, że dokument jest tylko do czytania.',
      ],
      hint: 'Sprawdź, czy ten dokument ma licencję.',
      tag: 'Otwarte dane',
      placement: 'right',
    },
    {
      id: 'zasobnik.mapa',
      route: (ctx) => pierwszyDokument(ctx, 'mapa-wyzwan'),
      target: 'zasobnik-mapa-obszary',
      title: 'Mapa Wyzwań Społecznych',
      body: [
        'Osiem obszarów pomocy społecznej, np. seniorzy czy ubóstwo. Dla każdego: liczby, wyzwania i postacie z życia.',
        'Pomaga zrozumieć potrzeby, zanim zaproponujesz rozwiązanie.',
      ],
      hint: 'Kliknij inny obszar i obejrzyj jego dane.',
      tag: 'Moduł II · Mapa Wyzwań',
      placement: 'bottom',
    },
    {
      id: 'zasobnik.wskazniki',
      route: '/zasobnik?dzial=wskazniki',
      target: 'zasobnik-wskazniki-szukaj',
      title: 'Wskaźniki Obserwatora',
      body: [
        'Trzeci dział to dane z Obserwatora Statystyk Społecznych ROPS, pogrupowane tematycznie.',
        'Znajdziesz tu np. wydatki gmin na pomoc społeczną.',
      ],
      hint: 'Wpisz „pomoc” i zobacz listę.',
      tag: 'Moduł II · Obserwator',
      placement: 'bottom',
      actions: [{ kind: 'fill', target: 'zasobnik-wskazniki-szukaj-pole', value: 'pomoc' }],
    },
    {
      id: 'zasobnik.eksplorator',
      route: wskaznik,
      target: 'zasobnik-wskaznik-mapa',
      title: 'Mapa i wykresy powiatów',
      body: [
        'Wskaźnik ma mapę powiatów Małopolski, ranking i wykres zmian w czasie. Ciemniejszy kolor to wyższe miejsce w rankingu.',
        'Dane pobierzesz jako CSV.',
      ],
      hint: 'Kliknij powiat na mapie, a trafi na wykres.',
      tag: 'Moduł II · Obserwator',
      placement: 'top',
      waitFor: { target: 'zasobnik-wskaznik-mapa', timeoutMs: 10000 },
    },
    {
      id: 'zasobnik.otwarte',
      route: '/otwarte-dane',
      target: 'zasobnik-otwarte-zbiory',
      title: 'Otwarte dane',
      body: [
        'Dane z Zasobnika pobierzesz jako CSV albo JSON, bez logowania i klucza. CSV otwiera się w Excelu.',
        'Niżej opisujemy licencję każdego zbioru.',
      ],
      hint: 'Kliknij „Pobierz CSV” przy innowacjach.',
      tag: 'Otwarte dane',
      placement: 'bottom',
    },
    {
      id: 'zasobnik.dalej',
      route: '/otwarte-dane',
      title: 'Co dalej: karta innowacji',
      body: [
        'Znasz już bibliotekę. Teraz wejdź w jedną innowację: zobacz jej kartę i dopasuj ją do swojej sytuacji.',
        'Zaczyna się rozdział „Karta innowacji”.',
      ],
      tag: 'Moduł II',
    },
  ],
}

export default chapter
