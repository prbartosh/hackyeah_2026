import type { TourChapter, TourContext } from '@/tour/types'

// Karta z zatwierdzonymi opiniami i testującymi (backend/scripts/seed_tester.py), więc działa też „Zapytaj instytucję”.
const DOMYSLNA = 'kody-qr-na-pomoc-seniorom'

/** Karta z czatu tylko wtedy, gdy ma testujących. Inaczej karta demo. */
async function slug(ctx: TourContext): Promise<string> {
  const zapisana = ctx.get('tester.slug')
  if (zapisana) return zapisana
  let wybrana = DOMYSLNA
  const zCzatu = ctx.get('innowacja.slug')
  if (zCzatu) {
    try {
      const o = await ctx.api<{ mozna_zapytac: boolean }>(`/innovations/${encodeURIComponent(zCzatu)}/opinie`)
      if (o.mozna_zapytac) wybrana = zCzatu
    } catch {
      /* zostaje karta demo */
    }
  }
  ctx.set('tester.slug', wybrana)
  if (!ctx.get('innowacja.slug')) ctx.set('innowacja.slug', wybrana)
  return wybrana
}
const karta = async (ctx: TourContext) => `/innowacja/${await slug(ctx)}`

const chapter: TourChapter = {
  id: 'tester',
  title: 'Tester innowacji',
  module: 'Moduł IV',
  summary: 'Poziom dowodu, opinie, zgłoszenie do testów i pytanie do instytucji, która testuje.',
  minutes: 4,
  steps: [
    {
      id: 'tester.poziom',
      route: karta,
      target: 'tester-poziom',
      title: 'Poziom dowodu',
      body: [
        'Trzy stopnie: Opisane, W testach, Sprawdzone. Poziom rośnie, gdy ROPS zatwierdzi opinie osób, które wdrożyły rozwiązanie.',
      ],
      hint: 'Zobacz, na którym stopniu stoi ta innowacja.',
      tag: 'Moduł IV',
      placement: 'top',
    },
    {
      id: 'tester.opinie',
      target: 'tester-opinie',
      title: 'Opinie testujących',
      body: [
        'Oceny i zgłoszenia innych instytucji. Znaczek „Dane demo” oznacza przykład, nie prawdziwą opinię.',
      ],
      hint: 'Przeczytaj jedną opinię i propozycję usprawnienia.',
      tag: 'Moduł IV',
    },
    {
      id: 'tester.przycisk',
      target: 'tester-akcje',
      title: 'Zgłoś się do testów',
      body: [
        'Chcesz sprawdzić rozwiązanie u siebie? Zgłoś się. Drugi przycisk pozwala ocenić innowację w skali 1–5.',
      ],
      hint: 'Kliknij „Chcę przetestować”.',
      tag: 'Moduł IV',
      actions: [{ kind: 'click', target: 'tester-przycisk-test' }],
      advanceOn: { kind: 'appear', target: 'tester-formularz-test' },
    },
    {
      id: 'tester.formularz',
      target: 'tester-formularz-test',
      title: 'Krótki formularz',
      body: [
        'Bez konta i bez nazwisk. Podaj typ instytucji i kilka zdań. „Zrób to za mnie” wpisze przykład [demo].',
      ],
      hint: 'Wpisz własne słowa albo użyj przykładu.',
      tag: 'Moduł IV',
      placement: 'left',
      actions: [
        { kind: 'fill', target: 'tester-test-instytucja', value: 'OPS w małym mieście [demo]' },
        { kind: 'fill', target: 'tester-test-tresc', value: '[demo] Chcemy przetestować to rozwiązanie przez trzy miesiące, z grupą 15 osób w naszym ośrodku.' },
        { kind: 'fill', target: 'tester-test-usprawnienie', value: '[demo] Sprawdzimy, czy da się je dopasować do małej gminy.' },
      ],
    },
    {
      id: 'tester.wyslij',
      target: 'tester-test-wyslij',
      title: 'Wyślij do ROPS',
      body: [
        'To prawdziwe zgłoszenie: trafi do skrzynki pracownika ROPS.',
      ],
      hint: 'Kliknij „Zgłoś się do testów”.',
      tag: 'Moduł IV',
      actions: [{ kind: 'click', target: 'tester-test-wyslij' }],
      advanceOn: { kind: 'appear', target: 'tester-potwierdzenie' },
    },
    {
      id: 'tester.moderacja',
      target: 'tester-potwierdzenie',
      title: 'Najpierw sprawdza człowiek',
      body: [
        'Pod linkiem zobaczysz odpowiedź ROPS. Opinia stanie się publiczna dopiero po zatwierdzeniu przez pracownika. Zobaczymy to w rozdziale o panelu.',
      ],
      hint: 'Zapisz link do wątku.',
      tag: 'Moderacja ROPS',
      waitFor: { target: 'tester-potwierdzenie', timeoutMs: 15000, message: 'Wysyłam zgłoszenie…' },
    },
    {
      id: 'tester.zapytaj',
      target: 'tester-zapytaj',
      title: 'Zapytaj tych, którzy testują',
      body: [
        'Pytanie idzie przez ROPS do instytucji, która już testuje. Ona nie zna Twoich danych, a Ty jej.',
      ],
      hint: 'Wpisz pytanie, np. o koszt i czas wdrożenia.',
      tag: 'Moduł IV · V',
      placement: 'top',
      actions: [
        { kind: 'click', target: 'tester-zapytaj-przycisk' },
        { kind: 'fill', target: 'tester-pytanie-tresc', value: '[demo] Ile trwało wdrożenie i co było najtrudniejsze?' },
        { kind: 'fill', target: 'tester-pytanie-instytucja', value: 'OPS w małym mieście [demo]' },
      ],
    },
    {
      id: 'tester.pytanie',
      target: 'tester-pytanie-wyslij',
      title: 'Wyślij pytanie',
      body: [
        'Odpowiedź pojawi się pod prywatnym linkiem. Pytanie trafia do tego samego panelu ROPS.',
      ],
      hint: 'Kliknij „Wyślij pytanie”.',
      tag: 'Moduł IV · V',
      actions: [{ kind: 'click', target: 'tester-pytanie-wyslij' }],
      advanceOn: { kind: 'appear', target: 'tester-pytanie-wyslano' },
    },
  ],
}

export default chapter
