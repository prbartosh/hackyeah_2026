import type { TourChapter } from '@/tour/types'

const chapter: TourChapter = {
  id: 'start',
  title: 'Start i dostępność',
  summary: 'Jak poruszać się po Splocie, ustawienia dostępności i ten przewodnik.',
  minutes: 3,
  steps: [
    {
      id: 'start.powitanie',
      route: '/',
      title: 'Witaj w Splocie',
      body: [
        'Splot łączy problem społeczny z gotową innowacją z Biblioteki Innowacji ROPS Kraków. Opisujesz sytuację własnymi słowami, a my podpowiadamy, co już działa.',
        'Korzystają z niego mieszkańcy, pracownicy CUS i OPS, partnerzy oraz ROPS.',
      ],
      hint: 'Kliknij „Dalej”, a pokażę, gdzie co jest.',
      tag: 'Cyfrowe serce Hubu',
    },
    {
      id: 'start.nawigacja',
      route: '/',
      target: 'nav-wyszukiwarka',
      title: 'Menu główne',
      body: [
        'Wyszukiwarka to czat z AI. Dalej: Zasobnik wiedzy, Kreator pomysłów, Zgłoś potrzebę i Współpraca. Logo zawsze wraca na start.',
        'Każdy moduł pokażę w osobnym rozdziale.',
      ],
      hint: 'Zerknij na menu: wyróżniona jest strona, na której jesteś.',
      tag: 'Moduły wyzwania',
      placement: 'bottom',
    },
    {
      id: 'start.tekst',
      route: '/',
      target: 'dostepnosc-tekst',
      title: 'Większy tekst jednym kliknięciem',
      body: [
        'Pasek u góry zmienia wielkość tekstu: A, A+ i A++. Ustawienie zostaje na kolejnych stronach.',
        'Pomaga, gdy drobny druk męczy oczy.',
      ],
      hint: 'Kliknij „A+” albo „Zrób to za mnie”.',
      tag: 'Dostępność',
      placement: 'bottom',
      actions: [{ kind: 'click', target: 'dostepnosc-tekst-duzy' }],
    },
    {
      id: 'start.motyw',
      route: '/',
      target: 'dostepnosc-motyw',
      title: 'Trzy motywy wyglądu',
      body: [
        'Jasny, ciemny i wysoki kontrast. Ciemny odpoczywa wieczorem, wysoki kontrast pomaga przy słabym wzroku.',
      ],
      hint: 'Kliknij „Ciemny” albo „Zrób to za mnie”.',
      tag: 'WCAG 2.1 AA',
      placement: 'bottom',
      actions: [{ kind: 'click', target: 'dostepnosc-motyw-ciemny' }],
    },
    {
      id: 'start.wroc',
      route: '/',
      target: 'dostepnosc-motyw',
      title: 'Zmiany możesz cofnąć',
      body: [
        'Te same przyciski przywracają ustawienia domyślne. Zostaw to, co jest wygodne dla Ciebie.',
      ],
      hint: 'Kliknij „Jasny” albo „Zrób to za mnie”.',
      tag: 'Dostępność',
      placement: 'bottom',
      actions: [
        { kind: 'click', target: 'dostepnosc-motyw-jasny' },
        { kind: 'click', target: 'dostepnosc-tekst-normalny' },
      ],
    },
    {
      id: 'start.deklaracja',
      route: '/dostepnosc',
      target: 'start-deklaracja',
      title: 'Co jeszcze ułatwia korzystanie',
      body: [
        'Deklaracja dostępności opisuje ułatwienia: czytanie na głos, prosty język, dyktowanie pytań i wersję tekstową dokumentów.',
        'Uczciwie podajemy też, czego jeszcze nie sprawdziliśmy.',
      ],
      hint: 'Przewiń do „Stanu dostępności” i zobacz, co jeszcze testujemy.',
      tag: 'Dostępność',
      placement: 'top',
    },
    {
      id: 'start.przewodnik',
      route: '/',
      target: 'przewodnik-przycisk',
      title: 'Przewodnik jest zawsze pod ręką',
      body: [
        'Ten przycisk otwiera przewodnik i spis rozdziałów. Możesz zwinąć chmurkę, zająć się Splotem i wrócić w to samo miejsce.',
      ],
      hint: 'Kliknij „Przewodnik”, żeby zobaczyć spis rozdziałów.',
      tag: 'Łatwy start',
      placement: 'bottom',
    },
    {
      id: 'start.dalej',
      route: '/',
      title: 'Zaczynamy od czatu',
      body: [
        'W następnych rozdziałach przejdziemy przez wszystko na żywo: czat z AI, Zasobnik wiedzy, innowacje, Kreator pomysłów, współpracę i panel ROPS.',
        'Wybierz rozdział w spisie albo kliknij „Dalej”.',
      ],
      tag: 'Cały Splot',
    },
  ],
}

export default chapter
