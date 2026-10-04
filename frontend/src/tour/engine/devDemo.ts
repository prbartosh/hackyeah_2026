// Kroki demonstracyjne silnika, tylko w trybie deweloperskim (?przewodnik=demo). Nie trafiają do produkcji.
import type { TourChapter } from '@/tour/types'

export const demoChapters: TourChapter[] = [
  {
    id: 'demo',
    title: 'Demo silnika',
    module: 'Moduł I',
    summary: 'Sprawdzian chmurek, podświetlenia, akcji i przejść między stronami.',
    minutes: 2,
    steps: [
      { id: 'demo.powitanie', title: 'Witaj w Splocie', tag: 'Dostępność', body: ['Krok bez elementu: chmurka stoi na środku ekranu.', 'Drugi akapit opisuje, po co to jest i dla kogo.'] },
      { id: 'demo.logo', route: '/', target: 'logo', title: 'Logo i strona główna', body: ['Klik w logo zawsze wraca na stronę główną.'], placement: 'bottom' },
      { id: 'demo.nav', route: '/', target: 'nav-zasobnik', title: 'Zasobnik wiedzy', body: ['Dokumenty, wzory i poradniki w jednym miejscu.'], hint: 'Kliknij „Zasobnik wiedzy”.', advanceOn: { kind: 'route', startsWith: '/zasobnik' } },
      {
        id: 'demo.motyw', route: '/', target: 'dostepnosc-motyw', title: 'Motyw strony', body: ['Jasny, ciemny i wysoki kontrast.'], hint: 'Kliknij „Ciemny”.',
        actions: [{ kind: 'click', target: 'dostepnosc-motyw-ciemny' }, { kind: 'click', target: 'dostepnosc-motyw-jasny' }],
      },
      { id: 'demo.tekst', route: '/', target: 'dostepnosc-tekst', title: 'Wielkość tekstu', body: ['A, A+ i A++.'], placement: 'bottom' },
      {
        id: 'demo.formularz', route: '/zglos', target: 'nie-ma-takiego-elementu', title: 'Brakujący element', body: ['Ten element nie istnieje, więc po 8 s pojawi się komunikat i „Pomiń krok”.'],
      },
      { id: 'demo.panel', route: '/admin', admin: true, target: 'panel-logowanie', title: 'Panel ROPS', tag: 'Moduł V', body: ['Krok wymagający logowania.'] },
      { id: 'demo.koniec', title: 'Koniec demonstracji', body: ['To ostatni krok rozdziału.'] },
    ],
  },
  {
    id: 'demo2',
    title: 'Drugi rozdział',
    summary: 'Pokazuje przejście do następnego rozdziału.',
    minutes: 1,
    steps: [{ id: 'demo2.jeden', route: '/zglos', title: 'Jedyny krok', body: ['Po nim ekran końcowy.'] }],
  },
  { id: 'demo3', title: 'Pusty rozdział', summary: 'Bez kroków: „wkrótce”.', minutes: 1, steps: [] },
]
