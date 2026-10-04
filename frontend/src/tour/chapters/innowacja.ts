import type { TourChapter, TourContext } from '@/tour/types'
import { clearCompare } from '@/hooks/useCompare'

// Karta z bogatymi danymi demo: oceny zatwierdzone przez ROPS, poziom „Sprawdzone” (backend/scripts/seed_tester.py).
const DOMYSLNA = 'kody-qr-na-pomoc-seniorom'
// Karty do porównania z wybraną (pierwsza inna niż bieżąca).
const DO_POROWNANIA = ['lekki-wozek-aktywny', 'teleasystent']

const slug = (ctx: TourContext): string => {
  const wybrana = ctx.get('innowacja.slug')
  if (wybrana) return wybrana
  ctx.set('innowacja.slug', DOMYSLNA)
  return DOMYSLNA
}
const druga = (ctx: TourContext) => DO_POROWNANIA.find((s) => s !== slug(ctx)) ?? DO_POROWNANIA[0]

const karta = (ctx: TourContext) => `/innowacja/${slug(ctx)}`
const kartaB = (ctx: TourContext) => `/innowacja/${druga(ctx)}`
const porownanie = (ctx: TourContext) => `/porownaj?slug=${slug(ctx)}&slug=${druga(ctx)}`

const chapter: TourChapter = {
  id: 'innowacja',
  title: 'Karta innowacji',
  module: 'Moduł II',
  summary: 'Strona innowacji: prosty język, czytanie na głos, porównanie i otwarte dane.',
  minutes: 4,
  onFinish: clearCompare,
  steps: [
    {
      id: 'innowacja.opis',
      route: karta,
      target: 'innowacja-opis',
      title: 'Cała innowacja na jednej stronie',
      body: [
        'Tak wygląda karta rozwiązania z Biblioteki Innowacji ROPS: na czym polega, jakich problemów dotyczy i dla kogo jest.',
        'Dzięki temu szybko ocenisz, czy to coś dla Ciebie.',
      ],
      hint: 'Przeczytaj pierwszy akapit.',
      tag: 'Moduł II',
      placement: 'auto',
    },
    {
      id: 'innowacja.dziala',
      target: 'innowacja-czy-dziala',
      title: 'Czy to działa?',
      body: [
        'Ocena ROPS: co już sprawdzono i z jakim skutkiem.',
        'Nie wdrażasz w ciemno, a wnioski masz z pierwszej ręki.',
      ],
      hint: 'Zobacz, co ROPS pisze o skuteczności.',
      tag: 'Ocena ROPS',
    },
    {
      id: 'innowacja.koszt',
      target: 'innowacja-koszt',
      title: 'Koszt i czas wdrożenia',
      body: [
        'Gdy ROPS nie podaje kosztu ani czasu, Splot pisze to wprost, zamiast zgadywać.',
        'Szczegóły bywają w materiałach do pobrania obok.',
      ],
      hint: 'Zerknij na materiały po prawej.',
      tag: 'Uczciwe dane',
    },
    {
      id: 'innowacja.prosty',
      target: 'innowacja-prosty-przycisk',
      title: 'Powiedz prościej',
      body: [
        'AI przepisze opis krótkimi zdaniami, bez trudnych słów (tekst łatwy do czytania). Pomaga, gdy opis jest długi albo urzędowy.',
      ],
      hint: 'Kliknij „Powiedz prościej” i poczekaj kilka sekund.',
      tag: 'Prosty język',
      actions: [{ kind: 'click', target: 'innowacja-prosty-przycisk' }],
      advanceOn: { kind: 'appear', target: 'innowacja-prosty-wynik', timeoutMs: 60000 },
    },
    {
      id: 'innowacja.prosty-wynik',
      target: 'innowacja-prosty-wynik',
      title: 'Opis w prostych słowach',
      body: [
        'To prawdziwa odpowiedź modelu, na podstawie opisu ROPS.',
        'Pod spodem jest link do źródła, więc oryginał zawsze sprawdzisz.',
      ],
      hint: 'Przeczytaj uproszczone zdania.',
      tag: 'Prosty język',
      waitFor: { target: 'innowacja-prosty-wynik', timeoutMs: 60000, message: 'AI upraszcza opis, to potrwa chwilę…' },
    },
    {
      id: 'innowacja.przeczytaj',
      target: 'innowacja-przeczytaj',
      title: 'Posłuchaj opisu',
      body: [
        'Przeglądarka przeczyta opis na głos. Wygodne dla osób słabowidzących i dla tych, które wolą słuchać.',
      ],
      hint: 'Kliknij „Przeczytaj opis”. Kliknij ponownie, żeby zatrzymać.',
      tag: 'Dostępność',
      actions: [{ kind: 'click', target: 'innowacja-przeczytaj' }],
    },
    {
      id: 'innowacja.porownaj-a',
      prepare: async () => clearCompare(),
      target: 'innowacja-porownaj-dodaj',
      title: 'Dodaj do porównania',
      body: [
        'Możesz zestawić obok siebie do trzech innowacji. Zacznij od tej karty.',
      ],
      hint: 'Kliknij „Dodaj do porównania”.',
      tag: 'Moduł II',
      placement: 'left',
      actions: [{ kind: 'click', target: 'innowacja-porownaj-dodaj' }],
    },
    {
      id: 'innowacja.porownaj-b',
      route: kartaB,
      target: 'innowacja-porownaj-dodaj',
      title: 'Dodaj drugą kartę',
      body: [
        'Do porównania potrzeba co najmniej dwóch kart. Wybrane zostają w pamięci przeglądarki, więc możesz wędrować po stronie.',
      ],
      hint: 'Kliknij „Dodaj do porównania” także tutaj.',
      tag: 'Moduł II',
      placement: 'left',
      actions: [{ kind: 'click', target: 'innowacja-porownaj-dodaj' }],
    },
    {
      id: 'innowacja.pasek',
      target: 'innowacja-pasek-porownania',
      title: 'Pasek porównania',
      body: [
        'Gdy masz dwie karty, na dole pojawia się pasek. Stąd przejdziesz do zestawienia.',
      ],
      hint: 'Kliknij „Porównaj”.',
      tag: 'Moduł II',
      placement: 'top',
      actions: [{ kind: 'click', target: 'innowacja-porownaj-przycisk' }],
      advanceOn: { kind: 'route', startsWith: '/porownaj' },
    },
    {
      id: 'innowacja.tabela',
      route: porownanie,
      target: 'innowacja-porownanie-tabela',
      title: 'Obok siebie',
      body: [
        'Problem, grupa docelowa, ocena ROPS, materiały i licencja w jednym zestawieniu. Adres strony zawiera wybór, więc możesz go komuś wysłać.',
      ],
      hint: 'Przewiń tabelę i porównaj wiersze.',
      tag: 'Moduł II',
      placement: 'top',
    },
    {
      id: 'innowacja.druk',
      target: 'innowacja-porownanie-druk',
      title: 'Wydrukuj albo zapisz PDF',
      body: [
        'Zestawienie przygotowane na spotkanie lub radę. Druk pomija menu i ozdobniki.',
      ],
      hint: 'Przycisk „Drukuj” otworzy okno druku.',
      tag: 'Dla instytucji',
      placement: 'bottom',
    },
  ],
}

export default chapter
