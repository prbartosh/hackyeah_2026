import type { TourChapter, TourContext } from '@/tour/types'

const OPIS =
  '[demo] Chcę zorganizować mobilny punkt porad dla samotnych seniorów w gminach wiejskich. ' +
  'Raz w tygodniu wolontariusze przyjadą busem do świetlicy, pomogą załatwić sprawy urzędowe i zdrowotne ' +
  'oraz połączą z ośrodkiem pomocy społecznej. Na razie to pomysł, potrzebujemy samochodu i wolontariuszy.'
const ISTOTA = '[demo] Mobilny punkt porad: raz w tygodniu wolontariusze z busem odwiedzają świetlice wiejskie i pomagają seniorom w sprawach urzędowych i zdrowotnych.'
const ODBIORCA = '[demo] Samotni seniorzy w małych miejscowościach'
const LOKALIZACJA = '[demo] Gmina Przykładowo'
const POTRZEBY = '[demo] Samochód, dwóch wolontariuszy i szkolenie z pierwszej pomocy.'
const CANVA_POLE = '[demo] Seniorzy rezygnują z załatwiania spraw urzędowych, bo nie mają jak dojechać.'

const KEY_FISZKA = 'kreator.fiszka'
const KEY_WNIOSEK = 'kreator.wniosek'

/** Zachowuje to, co wpisał użytkownik albo AI: przykład [demo] tylko do pustego pola. */
const keepOr = (target: string, demo: string) => () => {
  const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-tour="${target}"]`)
  return el?.value.trim() ? el.value : demo
}

const tokenFromPath = (pattern: RegExp) => pattern.exec(window.location.pathname)?.[1]

const finansowanieRoute = (ctx: TourContext) => {
  const token = ctx.get(KEY_FISZKA)
  return token ? `/kreator/finansowanie?fiszka=${token}` : '/kreator/finansowanie'
}

/** Szkic wniosku powstaje tylko w czasie naboru. Bez aktywnego naboru zostajemy na ekranie „Znajdź finansowanie”. */
async function prepareWniosek(ctx: TourContext) {
  const fromPath = tokenFromPath(/\/kreator\/wniosek\/([^/?#]+)/)
  if (fromPath) {
    ctx.set(KEY_WNIOSEK, fromPath)
    return
  }
  ctx.set(KEY_WNIOSEK, '')
  const fiszka = ctx.get(KEY_FISZKA)
  if (!fiszka) return
  const nabory = await ctx.api<{ aktywne: { nabor: { slug: string } }[] }>(`/kreator/nabory?fiszka=${fiszka}`)
  const slug = nabory.aktywne[0]?.nabor.slug
  if (!slug) return
  const wniosek = await ctx.api<{ token: string }>('/kreator/wnioski', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fiszka_token: fiszka, nabor_slug: slug }),
  })
  ctx.set(KEY_WNIOSEK, wniosek.token)
}

const chapter: TourChapter = {
  id: 'kreator',
  title: 'Kreator pomysłów',
  module: 'Moduł III',
  summary: 'Od pomysłu do fiszki, finansowania, wniosku i canvy z pomocą AI.',
  minutes: 6,
  steps: [
    {
      id: 'kreator.start',
      route: '/kreator',
      target: 'kreator-sciezki',
      title: 'Trzy drogi od pomysłu',
      body: [
        'Masz pomysł na rozwiązanie społeczne? Kreator pomaga go uporządkować: fiszka, szukanie pieniędzy i canva.',
        'Nie potrzebujesz konta ani wiedzy, wystarczy kilka zdań.',
      ],
      hint: 'Zerknij na trzy kafelki i kliknij »Dalej«.',
      tag: 'Moduł III',
      placement: 'bottom',
    },
    {
      id: 'kreator.opis',
      route: '/kreator/fiszka',
      target: 'kreator-opis',
      title: 'Opisz pomysł po swojemu',
      body: [
        'Fiszka to krótki opis pomysłu. Zacznij od kilku zdań własnymi słowami, możesz też podyktować głosem.',
        'AI wstępnie wypełni z nich fiszkę. Przykład ma dopisek [demo].',
      ],
      hint: 'Kliknij »Zrób to za mnie«. Odpowiedź AI trwa nawet minutę.',
      tag: 'Dostępność',
      placement: 'right',
      actions: [
        { kind: 'fill', target: 'kreator-opis', value: OPIS },
        { kind: 'click', target: 'kreator-ai' },
      ],
      advanceOn: { kind: 'appear', target: 'kreator-ai-wynik', timeoutMs: 60000 },
    },
    {
      id: 'kreator.ai-wynik',
      target: 'kreator-ai-wynik',
      title: 'AI podpowiada, Ty decydujesz',
      body: [
        'Pola od AI mają znaczek »Wypełnione przez AI: sprawdź i popraw«. Zmienisz każde z nich.',
        'AI niczego nie dopowiada ponad Twój opis.',
      ],
      hint: 'Kliknij »Dalej« na stronie, sprawdzimy pola po kolei.',
      tag: 'Moduł III',
      placement: 'bottom',
      actions: [{ kind: 'click', target: 'kreator-dalej' }],
      advanceOn: { kind: 'click', target: 'kreator-dalej' },
    },
    {
      id: 'kreator.istota',
      target: 'kreator-istota',
      title: 'Na czym polega pomysł',
      body: [
        'W 1–3 zdaniach napisz, co zrobisz i co się zmieni. Dzięki temu zespół ROPS od razu rozumie, o co chodzi.',
        'Jeśli pole jest puste, wpiszemy przykład [demo].',
      ],
      hint: 'Sprawdź tekst i popraw go, jeśli chcesz (min. 10 znaków).',
      tag: 'Moduł III',
      placement: 'right',
      actions: [{ kind: 'fill', target: 'kreator-istota', value: keepOr('kreator-istota', ISTOTA) }],
    },
    {
      id: 'kreator.podobne',
      target: 'kreator-podobne',
      title: 'Takie rozwiązania już działają',
      body: [
        'Platforma szuka w bazie ROPS innowacji podobnych do Twojego opisu. Każda ma źródło.',
        'Zanim zgłosisz pomysł, możesz z nich skorzystać albo się zainspirować.',
      ],
      hint: 'Przeczytaj, czy któreś rozwiązanie pasuje do Twojego.',
      tag: 'Moduł I',
      placement: 'top',
      waitFor: { target: 'kreator-podobne-wynik', timeoutMs: 15000, message: 'Szukam podobnych innowacji…' },
    },
    {
      id: 'kreator.zapis',
      target: 'kreator-zapis',
      title: 'Szkic zapisuje się sam',
      body: [
        'Piszesz, a platforma zapisuje szkic w tle. Adres strony to Twój link powrotny, a na stronie głównej Kreatora znajdziesz »Twoje szkice«.',
        'Konto nie jest potrzebne.',
      ],
      hint: 'Kliknij »Dalej« na stronie, przejdziemy do kolejnego pytania.',
      tag: 'Potencjał wdrożeniowy',
      placement: 'bottom',
      prepare: async (ctx) => {
        const token = tokenFromPath(/\/kreator\/fiszka\/([^/?#]+)/)
        if (token) ctx.set(KEY_FISZKA, token)
      },
      actions: [{ kind: 'click', target: 'kreator-dalej' }],
      advanceOn: { kind: 'click', target: 'kreator-dalej' },
    },
    {
      id: 'kreator.odbiorca',
      target: 'kreator-odbiorca',
      title: 'Dla kogo jest pomysł',
      body: [
        'Napisz, kto skorzysta: seniorzy, uczniowie, rodziny. Od tego zależy, jakie nabory i rozwiązania do Ciebie pasują.',
        'Wystarczy kilka słów.',
      ],
      hint: 'Wpisz odbiorców i kliknij »Dalej« na stronie.',
      tag: 'Moduł III',
      placement: 'right',
      actions: [
        { kind: 'fill', target: 'kreator-odbiorca', value: keepOr('kreator-odbiorca', ODBIORCA) },
        { kind: 'click', target: 'kreator-dalej' },
      ],
      advanceOn: { kind: 'click', target: 'kreator-dalej' },
    },
    {
      id: 'kreator.etap',
      target: 'kreator-etap',
      title: 'Na jakim etapie jesteś',
      body: [
        'Pomysł, test w mikroskali albo wdrożone lokalnie. Nie ma złej odpowiedzi, wybór pomaga dobrać wsparcie.',
        'Nie wiesz? Wybierz »Pomysł«.',
      ],
      hint: 'Wybierz etap i kliknij »Dalej« na stronie.',
      tag: 'Moduł III',
      placement: 'right',
      actions: [
        { kind: 'check', target: 'kreator-etap-pomysl' },
        { kind: 'click', target: 'kreator-dalej' },
      ],
      advanceOn: { kind: 'click', target: 'kreator-dalej' },
    },
    {
      id: 'kreator.dodatkowe',
      target: 'kreator-dodatkowe',
      title: 'Dodatkowe informacje, jeśli chcesz',
      body: [
        'Obszar, miejsce i potrzeby pomagają dopasować nabór i napisać wniosek. Możesz je pominąć.',
        'Przykład ma dopisek [demo].',
      ],
      hint: 'Kliknij »Dalej« na stronie, zobaczysz podgląd fiszki.',
      tag: 'Moduł III',
      placement: 'right',
      actions: [
        { kind: 'select', target: 'kreator-obszar', value: 'dla-seniorow' },
        { kind: 'fill', target: 'kreator-lokalizacja', value: keepOr('kreator-lokalizacja', LOKALIZACJA) },
        { kind: 'fill', target: 'kreator-potrzeby', value: keepOr('kreator-potrzeby', POTRZEBY) },
        { kind: 'click', target: 'kreator-dalej' },
      ],
      advanceOn: { kind: 'click', target: 'kreator-dalej' },
    },
    {
      id: 'kreator.asystent',
      target: 'kreator-asystent',
      title: 'Asystent zadaje pytania',
      body: [
        'To podgląd fiszki. Asystent wskaże braki i zada pytania, które pomogą dopracować pomysł.',
        'Niczego nie dopisuje za Ciebie.',
      ],
      hint: 'Kliknij »Zrób to za mnie«. Odpowiedź AI trwa nawet minutę.',
      tag: 'Moduł III',
      placement: 'top',
      actions: [{ kind: 'click', target: 'kreator-asystent-pytaj' }],
      advanceOn: { kind: 'appear', target: 'kreator-asystent-wynik', timeoutMs: 60000 },
    },
    {
      id: 'kreator.wyslij',
      target: 'kreator-wyslij',
      title: 'Wyślij pomysł do ROPS',
      body: [
        'Wysłana fiszka trafia do skrzynki zespołu ROPS jako zgłoszenie. Odpowiedź zobaczysz pod własnym linkiem.',
        'To prawdziwe zgłoszenie, oznaczone [demo].',
      ],
      hint: 'Kliknij »Wyślij pomysł do ROPS«.',
      tag: 'Moduł III',
      placement: 'top',
      actions: [{ kind: 'click', target: 'kreator-wyslij' }],
      advanceOn: { kind: 'appear', target: 'kreator-wyslano', timeoutMs: 20000 },
    },
    {
      id: 'kreator.finansowanie',
      route: finansowanieRoute,
      target: 'kreator-nabory',
      title: 'Znajdź finansowanie',
      body: [
        'Kreator dopasowuje trwające nabory do Twojej fiszki i w jednym zdaniu mówi, dlaczego pasują.',
        'Gdy żaden nabór nie trwa, pokaże termin następnego. Nabory dodaje ROPS w panelu.',
      ],
      hint: 'Przeczytaj uzasadnienie dopasowania.',
      tag: 'Moduł III',
      placement: 'bottom',
    },
    {
      id: 'kreator.wniosek',
      prepare: prepareWniosek,
      route: (ctx) => {
        const wniosek = ctx.get(KEY_WNIOSEK)
        return wniosek ? `/kreator/wniosek/${wniosek}` : finansowanieRoute(ctx)
      },
      target: 'kreator-wniosek-eksport',
      title: 'Szkic wniosku do pobrania',
      body: [
        'W czasie naboru fiszka zamienia się w szkic wniosku: bez dopisków od AI, braki oznaczone »Do uzupełnienia«. Pobierzesz go jako DOCX.',
        'Poza naborem generator czeka na ROPS.',
      ],
      hint: 'Zobacz przyciski pobierania pod polami wniosku.',
      tag: 'Moduł III',
      placement: 'left',
    },
    {
      id: 'kreator.canva',
      route: (ctx) => {
        const token = ctx.get(KEY_FISZKA)
        return token ? `/kreator/canva?fiszka=${token}` : '/kreator/canva'
      },
      target: 'kreator-canva-start',
      title: 'Canva: plansza na pomysł',
      body: [
        'Canva to plansza z 16 polami w 7 krokach: problem, osoby, rozwiązanie, koszty i dochody. Każde pole ma podpowiedź.',
        'Pobierzesz ją jako DOCX albo wydrukujesz.',
      ],
      hint: 'Kliknij »Rozpocznij wypełnianie«.',
      tag: 'Moduł III',
      placement: 'top',
      actions: [
        { kind: 'fill', target: 'kreator-canva-nazwa', value: '[demo] Mobilny punkt porad' },
        { kind: 'click', target: 'kreator-canva-start' },
      ],
      advanceOn: { kind: 'route', startsWith: '/kreator/canva/' },
    },
    {
      id: 'kreator.canva-pole',
      target: 'kreator-canva-pole',
      title: 'Wypełnij pierwsze pole',
      body: [
        'Pod polem są pytania pomocnicze, a szkic zapisuje się sam. Wpisz kilka słów i idź dalej.',
        'Resztę dokończysz, kiedy chcesz, z linku w adresie.',
      ],
      hint: 'Wpisz pierwsze zdanie o problemie.',
      tag: 'Moduł III',
      placement: 'right',
      actions: [{ kind: 'fill', target: 'kreator-canva-pole', value: CANVA_POLE }],
    },
  ],
}

export default chapter
