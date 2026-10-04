import type { TourChapter, TourContext } from '@/tour/types'

const DOMYSLNA = 'kody-qr-na-pomoc-seniorom'

const slug = (ctx: TourContext): string => {
  const wybrana = ctx.get('innowacja.slug')
  if (wybrana) return wybrana
  ctx.set('innowacja.slug', DOMYSLNA)
  return DOMYSLNA
}
const karta = (ctx: TourContext) => `/innowacja/${slug(ctx)}`
const wdrozenie = (ctx: TourContext) => `/innowacja/${slug(ctx)}/wdrozenie`

const chapter: TourChapter = {
  id: 'middleman',
  title: 'Middleman innowacji',
  module: 'Moduł VII',
  summary: 'Asystent AI zamienia opis innowacji w kartę wdrożenia dla Twojej instytucji.',
  minutes: 4,
  steps: [
    {
      id: 'middleman.przycisk',
      route: karta,
      target: 'middleman-dostosuj',
      title: 'Dostosuj do swojej instytucji',
      body: [
        'Innowacja z Biblioteki to opis, nie gotowy plan. Asystent AI zamieni go w kartę usługi dla Twojego ośrodka.',
      ],
      hint: 'Kliknij „Dostosuj do mojej instytucji”.',
      tag: 'Moduł VII · +5%',
      placement: 'left',
      actions: [{ kind: 'click', target: 'middleman-dostosuj' }],
      advanceOn: { kind: 'click', target: 'middleman-dostosuj' },
    },
    {
      id: 'middleman.rola',
      route: wdrozenie,
      target: 'middleman-rola',
      title: 'Kim jesteś?',
      body: [
        'Pracownik CUS lub OPS, albo samorząd, NGO, ekspert. Od tego zależą kroki i zasoby w karcie.',
      ],
      hint: 'Wybierz rolę (przy ustawionej w czacie możesz ją zmienić).',
      tag: 'Moduł VII · +5%',
      actions: [{ kind: 'check', target: 'middleman-rola-cus-ops', checked: true }],
    },
    {
      id: 'middleman.generuj',
      target: 'middleman-przygotuj',
      title: 'Przygotuj kartę',
      body: [
        'Model czyta tylko opis z Biblioteki ROPS i pisze plan: cel, kroki, zasoby, ryzyka. To potrwa kilka sekund.',
      ],
      hint: 'Kliknij „Przygotuj kartę wdrożenia”.',
      tag: 'AI na żywo',
      actions: [{ kind: 'click', target: 'middleman-przygotuj' }],
      advanceOn: { kind: 'appear', target: 'middleman-karta', timeoutMs: 90000 },
    },
    {
      id: 'middleman.karta',
      target: 'middleman-karta',
      title: 'Plan wdrożenia gotowy',
      body: [
        'Czego nie ma w opisie, model oznacza „do uzupełnienia”, zamiast zmyślać. Sprawdź kartę przed użyciem.',
      ],
      hint: 'Przewiń kroki i zasoby.',
      tag: 'Moduł VII · +5%',
      placement: 'right',
      waitFor: { target: 'middleman-karta', timeoutMs: 90000, message: 'AI przygotowuje kartę wdrożenia…' },
    },
    {
      id: 'middleman.druk',
      target: 'middleman-druk',
      title: 'Zabierz kartę ze sobą',
      body: [
        'Wydrukuj ją na spotkanie zespołu albo zapisz jako PDF. Wydruk zawiera tylko kartę, bez menu.',
      ],
      hint: 'Przycisk „Drukuj lub zapisz PDF” otworzy okno druku.',
      tag: 'Dla instytucji',
      placement: 'left',
    },
    {
      id: 'middleman.wdroz',
      target: 'middleman-wdroz',
      title: 'Chcę to wdrożyć',
      body: [
        'Wyślij kartę do ROPS. Pracownik pomoże z materiałami i kontaktem do autorów. Dopisz kilka słów od siebie.',
      ],
      hint: 'Napisz wiadomość i wyślij.',
      tag: 'Moduł VII · +5%',
      placement: 'left',
      actions: [
        { kind: 'fill', target: 'middleman-wiadomosc', value: '[demo] Jesteśmy OPS w małym mieście i chcemy zacząć wiosną. Prosimy o kontakt do autorów.' },
        { kind: 'click', target: 'middleman-wyslij' },
      ],
      advanceOn: { kind: 'appear', target: 'middleman-wyslano', timeoutMs: 15000 },
    },
    {
      id: 'middleman.wyslano',
      target: 'middleman-wyslano',
      title: 'Karta jest w ROPS',
      body: [
        'To zwykłe zgłoszenie w skrzynce panelu. Odpowiedź przyjdzie pod zapisanym linkiem, bez zakładania konta.',
      ],
      hint: 'Zapisz link do wątku.',
      tag: 'Moduł VII · V',
      waitFor: { target: 'middleman-wyslano', timeoutMs: 15000, message: 'Wysyłam kartę do ROPS…' },
    },
  ],
}

export default chapter
