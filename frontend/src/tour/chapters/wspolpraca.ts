import type { TourChapter, TourContext } from '@/tour/types'

const OPIS =
  '[demo] Prowadzimy w gminie klub seniora i brakuje nam pomysłu, jak pomóc osobom samotnym, które rzadko wychodzą z domu. Szukamy sprawdzonego rozwiązania.'

/** Adres wątku z zapisanego linku. Gdy ktoś pominął zgłoszenie, zakładamy przykładowe, żeby kroki wątku miały na czym działać. */
async function watekRoute(ctx: TourContext): Promise<string> {
  let token = ctx.get('watek.token')
  if (!token) {
    const r = await ctx.api<{ token_watku: string }>('/zgloszenia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tresc: OPIS }),
    })
    token = r.token_watku
    ctx.set('watek.token', token)
  }
  return `/watek/${token}`
}

const chapter: TourChapter = {
  id: 'wspolpraca',
  title: 'Zgłoszenia i wątek z ROPS',
  module: 'Moduł V',
  summary: 'Zgłoszenie potrzeby, dwustronny wątek bez konta, mentor i obserwowanie potrzeby.',
  minutes: 4,
  steps: [
    {
      id: 'wspolpraca.hub',
      route: '/wspolpraca',
      target: 'wspolpraca-kafelki',
      title: 'Tu zaczyna się kontakt z ROPS',
      body: [
        'Nie znalazłeś gotowego rozwiązania? Stąd zadasz pytanie, zgłosisz potrzebę, poprosisz o mentora albo znajdziesz partnera.',
      ],
      hint: 'Rozejrzyj się po kafelkach. Konta nie potrzebujesz.',
      tag: 'Bez konta',
      placement: 'bottom',
    },
    {
      id: 'wspolpraca.jak',
      route: '/wspolpraca',
      target: 'wspolpraca-jak',
      title: 'Jak wygląda rozmowa',
      body: [
        'Piszesz, a pracownik ROPS odpowiada w wątku albo łączy Cię z mentorem lub partnerem. Linki dostajesz od razu na ekranie, a e-mail tylko wtedy, gdy go podasz.',
      ],
      tag: 'Moduł V',
      placement: 'top',
    },
    {
      id: 'wspolpraca.opis',
      route: '/zglos',
      target: 'wspolpraca-opis',
      title: 'Opisz swoją potrzebę',
      body: [
        'Pracownik ROPS przeczyta opis i wskaże rozwiązania z bazy. Wystarczy kilka zdań, bez danych wrażliwych i numerów dokumentów.',
      ],
      hint: 'Wpisz opis (min. 10 znaków) albo kliknij „Zrób to za mnie”.',
      tag: 'Moduł V',
      placement: 'right',
      actions: [{ kind: 'fill', target: 'wspolpraca-opis', value: OPIS }],
    },
    {
      id: 'wspolpraca.obserwuj',
      route: '/zglos',
      target: 'wspolpraca-obserwuj',
      title: 'Obserwuj swoją potrzebę',
      body: [
        'Gdy w bazie jeszcze nie ma rozwiązania, nie musisz wracać i sprawdzać. Dostaniesz powiadomienie w wątku, a po podaniu e-maila także w skrzynce.',
      ],
      hint: 'Zaznacz „Powiadom mnie”.',
      tag: 'Moduł V',
      placement: 'top',
      actions: [{ kind: 'check', target: 'wspolpraca-obserwuj', checked: true }],
    },
    {
      id: 'wspolpraca.wyslij',
      route: '/zglos',
      target: 'wspolpraca-wyslij',
      title: 'Wyślij zgłoszenie',
      body: [
        'Zgłoszenie trafia do panelu ROPS i tworzy tam powiadomienie. Na demo e-mail do zespołu tylko zapisuje się w logu, bo nie ma skonfigurowanej poczty.',
      ],
      hint: 'Kliknij „Wyślij zgłoszenie”. Powstanie prawdziwy rekord.',
      tag: 'Moduł V',
      placement: 'top',
      actions: [{ kind: 'click', target: 'wspolpraca-wyslij' }],
      advanceOn: { kind: 'appear', target: 'wspolpraca-link-watku', timeoutMs: 10000 },
    },
    {
      id: 'wspolpraca.potwierdzenie',
      target: 'wspolpraca-link-watku',
      title: 'Twój prywatny link do sprawy',
      body: [
        'Zamiast konta dostajesz prywatny link do rozmowy. Zna go tylko ten, komu go pokażesz, więc zapisz go albo dodaj do zakładek.',
      ],
      hint: 'Kliknij „Zrób to za mnie”, a zapamiętamy link i otworzymy wątek.',
      tag: 'Bez konta',
      placement: 'bottom',
      actions: [
        { kind: 'capture', target: 'wspolpraca-link-watku', key: 'watek.token', from: 'href', pattern: '/watek/([^/?#]+)' },
      ],
    },
    {
      id: 'wspolpraca.status',
      route: watekRoute,
      target: 'wspolpraca-status',
      title: 'Tu ROPS odpowie na zgłoszenie',
      body: [
        'Wróć na ten adres, gdy będziesz chciał zobaczyć odpowiedź. Pracownik odpowie z panelu; pokażemy to w rozdziale o panelu ROPS, na tym samym zgłoszeniu.',
      ],
      tag: 'Moduł V',
      placement: 'bottom',
    },
    {
      id: 'wspolpraca.wiadomosc',
      route: watekRoute,
      target: 'wspolpraca-wiadomosc',
      title: 'Dopisz wiadomość do ROPS',
      body: [
        'To rozmowa, nie jednorazowy formularz. Możesz dopisać szczegóły albo dopytać, a zespół ROPS od razu dostanie powiadomienie.',
      ],
      hint: 'Napisz kilka słów i wyślij.',
      tag: 'Moduł V',
      placement: 'top',
      actions: [
        { kind: 'fill', target: 'wspolpraca-wiadomosc', value: '[demo] Dopisuję szczegół: chodzi o gminę wiejską, w której nie ma regularnego transportu.' },
        { kind: 'click', target: 'wspolpraca-wyslij-wiadomosc' },
      ],
    },
    {
      id: 'wspolpraca.rozmowa',
      route: watekRoute,
      target: 'wspolpraca-rozmowa',
      title: 'Cała rozmowa w jednym miejscu',
      body: [
        'Twoje wiadomości i odpowiedzi ROPS lub mentora są ułożone jak rozmowa, z datą i rolą nadawcy. Wszystko widać bez logowania.',
      ],
      tag: 'Moduł V',
      placement: 'top',
    },
    {
      id: 'wspolpraca.mentor',
      route: watekRoute,
      target: 'wspolpraca-mentor',
      title: 'Poproś o mentora',
      body: [
        'Mentor to doświadczona osoba, która pomoże wdrożyć rozwiązanie. Nie wybierasz jej sam: pracownik ROPS dobierze mentora do Twojej sprawy.',
      ],
      hint: 'Kliknij „Poproś mentora”.',
      tag: 'Moduł V',
      placement: 'top',
      actions: [{ kind: 'click', target: 'wspolpraca-mentor' }],
    },
    {
      id: 'wspolpraca.kopiuj',
      route: watekRoute,
      target: 'wspolpraca-kopiuj-link',
      title: 'Zachowaj albo udostępnij link',
      body: [
        'Skopiuj prywatny link, żeby wrócić z innego urządzenia albo pokazać sprawę współpracownikowi. Kto go ma, ten widzi rozmowę.',
      ],
      hint: 'Kliknij „Skopiuj link do wątku”.',
      tag: 'RODO',
      placement: 'bottom',
      actions: [{ kind: 'click', target: 'wspolpraca-kopiuj-link' }],
    },
    {
      id: 'wspolpraca.moje-sprawy',
      route: '/wspolpraca',
      target: 'wspolpraca-lista-spraw',
      title: 'Moje sprawy',
      body: [
        'Zgłoszenia z tej przeglądarki wracają tu jako lista linków. Zapisujemy ją tylko u Ciebie, nie na koncie, więc po zmianie przeglądarki użyj zapisanego linku.',
      ],
      hint: 'Kliknij zgłoszenie, żeby wrócić do rozmowy.',
      tag: 'Bez konta',
      placement: 'top',
    },
  ],
}

export default chapter
