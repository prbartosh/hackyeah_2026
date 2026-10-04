import type { TourChapter, TourContext } from '@/tour/types'

interface Oferta { id: number }

/** Gdy użytkownik pominął krok z wiadomością, rozmowę zakładamy sami (publiczne API zwraca prywatny link). */
async function zapewnijRozmowe(ctx: TourContext) {
  if (ctx.get('rozmowa.token')) return
  const oferty = await ctx.api<Oferta[]>('/partnerstwa')
  if (oferty.length === 0) return
  const res = await ctx.api<{ token_rozmowy: string }>(`/partnerstwa/${oferty[0].id}/kontakt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nadawca_nazwa: 'Zespół przewodnika (demo)',
      nadawca_email: 'przewodnik-demo@example.test',
      tresc: 'Dzień dobry, to wiadomość z przewodnika po platformie. Chętnie dowiem się więcej o ogłoszeniu.',
    }),
  })
  ctx.set('rozmowa.token', res.token_rozmowy)
}

const chapter: TourChapter = {
  id: 'siec',
  title: 'Pytania, mentorzy i partnerstwa',
  module: 'Moduł V',
  summary: 'Publiczne FAQ, lista mentorów i giełda partnerstw z rozmowami przez ROPS.',
  minutes: 4,
  steps: [
    {
      id: 'siec.pytania-lista',
      route: '/pytania',
      target: 'siec-pytania-lista',
      title: 'Odpowiedzi ROPS od ręki',
      body: [
        'To pytania innych osób, na które ROPS Kraków już odpowiedział i które opublikował.',
        'Zanim zapytasz, sprawdź, czy ktoś już o to nie pytał.',
      ],
      hint: 'Kliknij dowolne pytanie, żeby zobaczyć odpowiedź.',
      tag: 'Moduł V',
      placement: 'top',
    },
    {
      id: 'siec.pytania-zadaj',
      target: 'siec-pytania-zadaj',
      title: 'Nie ma Twojego pytania?',
      body: [
        'Zapytaj ROPS bez konta. To miejsce na pytania ogólne; własną, prywatną sprawę opisz w zgłoszeniu.',
      ],
      hint: 'Kliknij „Zadaj pytanie”.',
      tag: 'Bez konta',
      actions: [{ kind: 'click', target: 'siec-pytania-zadaj' }],
      advanceOn: { kind: 'click', target: 'siec-pytania-zadaj' },
    },
    {
      id: 'siec.pytania-formularz',
      target: 'siec-pytania-form',
      title: 'Zgoda to Twoja decyzja',
      body: [
        'Imię i e-mail są dobrowolne, a e-mail nigdy nie jest publiczny.',
        'Pytanie pokażemy innym tylko wtedy, gdy zaznaczysz zgodę, i bez Twoich danych.',
      ],
      hint: 'Wpisz pytanie i wyślij je do ROPS.',
      tag: 'Prywatność',
      placement: 'right',
      actions: [
        {
          kind: 'fill',
          target: 'siec-pytania-tresc',
          value: 'Czy z Giełdy partnerstw mogą korzystać także mieszkańcy, nie tylko instytucje? (pytanie z przewodnika)',
        },
        { kind: 'click', target: 'siec-pytania-wyslij' },
      ],
    },
    {
      id: 'siec.pytania-moderacja',
      target: 'siec-pytania-status',
      title: 'Najpierw czyta to człowiek',
      body: [
        'Pytanie trafiło do pracownika ROPS. To on odpowie i zdecyduje o publikacji, nic nie pojawia się publicznie samo.',
        'Panel ROPS zobaczysz w ostatnim rozdziale.',
      ],
      tag: 'Moderacja',
      placement: 'bottom',
    },
    {
      id: 'siec.mentorzy-lista',
      route: '/mentorzy',
      target: 'siec-mentorzy-lista',
      title: 'Eksperci do pomocy',
      body: [
        'Doświadczone osoby i organizacje z Małopolski, które wspierają wdrożenia. Widzisz ich obszary i powiat, ale nie ich e-maile.',
      ],
      hint: 'Przewiń listę i znajdź mentora z Twojego obszaru.',
      tag: 'Moduł V',
      placement: 'top',
    },
    {
      id: 'siec.mentorzy-jak',
      target: 'siec-mentorzy-jak',
      title: 'Jak poprosić o mentora',
      body: [
        'Prosisz ze swojego wątku zgłoszenia, przyciskiem „Poproś mentora”. Mentora dobiera pracownik ROPS, więc Twoja sprawa trafia tylko do wybranej osoby.',
      ],
      hint: 'Przeczytaj trzy kroki.',
      tag: 'Moduł V',
      placement: 'bottom',
    },
    {
      id: 'siec.mentorzy-link',
      target: 'siec-mentorzy-kontakt',
      title: 'Mentor odpowiada bez konta',
      body: [
        'Mentor dostaje e-mailem prywatny link tylko do Twojej sprawy. Odpowiada przez niego, nie widzi Twojego e-maila ani nazwiska, a ROPS może mu dostęp odebrać.',
      ],
      tag: 'Bez konta',
      placement: 'top',
    },
    {
      id: 'siec.gielda-filtry',
      route: '/partnerstwa',
      target: 'siec-gielda-filtry',
      title: 'Giełda partnerstw',
      body: [
        'Instytucje szukają partnera albo oferują wsparcie. Filtry zostawią tylko to, co Cię dotyczy.',
      ],
      hint: 'Wybierz w polu „Rodzaj” opcję „Szukam partnera”.',
      tag: 'Moduł V',
      placement: 'bottom',
      actions: [{ kind: 'select', target: 'siec-gielda-typ', value: 'szukam_partnera' }],
    },
    {
      id: 'siec.gielda-dodaj',
      target: 'siec-gielda-dodaj',
      title: 'Dodaj własne ogłoszenie',
      body: ['Szukasz partnera albo chcesz pomóc? Wystarczy krótki formularz, bez konta.'],
      hint: 'Kliknij „Dodaj ogłoszenie”.',
      tag: 'Bez konta',
      actions: [{ kind: 'click', target: 'siec-gielda-dodaj' }],
      advanceOn: { kind: 'click', target: 'siec-gielda-dodaj' },
    },
    {
      id: 'siec.gielda-formularz',
      target: 'siec-gielda-form',
      title: 'Najpierw sprawdza ROPS',
      body: [
        'Ogłoszenie pojawi się na liście dopiero po sprawdzeniu przez pracownika ROPS, co chroni przed spamem.',
        'Twój e-mail nigdy nie jest publiczny.',
      ],
      hint: 'Wypełnij formularz i wyślij ogłoszenie.',
      tag: 'Moderacja',
      placement: 'right',
      actions: [
        { kind: 'fill', target: 'siec-gielda-instytucja', value: 'Przykładowe Stowarzyszenie (przewodnik)' },
        { kind: 'fill', target: 'siec-gielda-tytul', value: 'Szukamy partnera do pilotażu (przewodnik)' },
        {
          kind: 'fill',
          target: 'siec-gielda-opis',
          value: 'Ogłoszenie utworzone przez przewodnik po platformie. Szukamy organizacji, która pomoże w szkoleniu opiekunów.',
        },
        { kind: 'fill', target: 'siec-gielda-email', value: 'przewodnik@example.test' },
        { kind: 'click', target: 'siec-gielda-wyslij' },
      ],
    },
    {
      id: 'siec.gielda-kontakt',
      target: 'siec-gielda-kontakt',
      title: 'Napisz do autora przez ROPS',
      body: [
        'Odpowiadasz na ogłoszenie przez ROPS, który przekazuje wiadomość. Autor nie zobaczy Twojego e-maila, a Ty jego.',
      ],
      hint: 'Kliknij „Napisz przez ROPS” przy pierwszym ogłoszeniu.',
      tag: 'Prywatność',
      placement: 'top',
      actions: [
        { kind: 'click', target: 'siec-gielda-kontakt' },
        { kind: 'fill', target: 'siec-gielda-kontakt-nazwa', value: 'Zespół przewodnika (demo)' },
        { kind: 'fill', target: 'siec-gielda-kontakt-email', value: 'przewodnik-demo@example.test' },
        {
          kind: 'fill',
          target: 'siec-gielda-kontakt-tresc',
          value: 'Dzień dobry, to wiadomość z przewodnika po platformie. Chętnie dowiem się więcej o ogłoszeniu.',
        },
        { kind: 'click', target: 'siec-gielda-kontakt-wyslij' },
        { kind: 'capture', target: 'siec-gielda-rozmowa', key: 'rozmowa.token', from: 'href', pattern: '/rozmowa/([^/?#]+)' },
      ],
    },
    {
      id: 'siec.rozmowa',
      route: async (ctx) => {
        await zapewnijRozmowe(ctx)
        return `/rozmowa/${encodeURIComponent(ctx.get('rozmowa.token') ?? '')}`
      },
      target: 'siec-rozmowa-info',
      title: 'Rozmowa pod prywatnym linkiem',
      body: [
        'Odpowiedź autora pojawi się tutaj, bez konta. Zachowaj ten link: to Twój jedyny dostęp do rozmowy.',
        'ROPS widzi całość i może ją zamknąć przy nadużyciu.',
      ],
      hint: 'Kliknij „Skopiuj link”, żeby go nie zgubić.',
      tag: 'Bez konta',
      placement: 'bottom',
    },
  ],
}

export default chapter
