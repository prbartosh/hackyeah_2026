import { CHAT_RESET_EVENT } from '@/lib/chatEvents'
import type { TourChapter } from '@/tour/types'

// Przewodnik dla sędziego: ok. 2–3 minuty, najważniejsza funkcja (czat) na żywo od opisu do karty innowacji,
// na końcu odesłanie do pełnego przewodnika. Tryb strict: klikać można tylko omawiany element, bez pomijania kroków.
// Zgłoszenie #1 z zestawu testowego (mama z demencją) z gminą, żeby pokazały się też dane gminy.
const ZGLOSZENIE =
  'Mama ma początki demencji i dzwoni do mnie po 10 razy dziennie, bo nie pamięta, czy brała leki i gdzie są klucze. ' +
  'Mieszkamy w gminie Wieliczka. Nie mogę być przy niej cały dzień, a do DPS-u nie chce iść. ' +
  'Szukam czegoś prostego, co jej pomoże w domu.'

const MODEL = 90_000
const TAG = 'Moduł I · 10%'

const chapter: TourChapter = {
  id: 'sedzia',
  title: 'Splot w 2 minuty',
  summary: 'Najważniejsza funkcja na żywo: opis problemu, pytanie AI, dopasowane innowacje i karta rozwiązania.',
  minutes: 3,
  standalone: true,
  strict: true,
  steps: [
    {
      id: 'sedzia.witaj',
      // Zawsze od czystej rozmowy, nawet gdy ktoś wcześniej korzystał z czatu.
      route: () => {
        window.dispatchEvent(new Event(CHAT_RESET_EVENT))
        return '/'
      },
      title: 'Splot w 2 minuty',
      body: [
        'ROPS Kraków ma bibliotekę ponad stu sprawdzonych innowacji społecznych, ale trudno w niej znaleźć coś na swój problem.',
        'Splot to robi: opisujesz sprawę swoimi słowami, a AI dobiera rozwiązania. Pokażemy to na żywo, krok po kroku.',
      ],
      hint: 'Klikaj przyciski w tej chmurce. Podświetlony element na stronie też jest klikalny.',
      tag: 'Start',
    },
    {
      id: 'sedzia.opis',
      target: 'czat-ramka',
      title: 'Opisz problem po swojemu',
      body: [
        'Bez formularzy i fachowych słów. Przykład: córka opiekuje się mamą z początkami demencji.',
        'Z wyszukiwarki skorzysta mieszkaniec, pracownik OPS i urzędnik gminy.',
      ],
      hint: 'Kliknij „Zrób to za mnie”, a wpiszemy i wyślemy przykładowy opis.',
      tag: TAG,
      placement: 'top',
      actions: [
        { kind: 'fill', target: 'czat-pole', value: ZGLOSZENIE },
        { kind: 'click', target: 'czat-wyslij' },
      ],
      advanceOn: { kind: 'appear', target: 'czat-rola', timeoutMs: MODEL },
    },
    {
      id: 'sedzia.zrozumienie',
      target: 'czat-panel',
      title: 'AI rozumie, o co chodzi',
      body: [
        'Model rozpoznaje, kim jesteś, i układa kartę problemu: kogo dotyczy, gdzie i w jakiej skali. Do gminy dokłada dane z Obserwatora Statystyk ROPS.',
      ],
      hint: 'Zobacz, jak AI streściło opis, i kliknij „Dalej”.',
      tag: TAG,
      placement: 'right',
      waitFor: { target: 'czat-rola', timeoutMs: MODEL, message: 'Model analizuje opis, to kilka sekund…' },
    },
    {
      id: 'sedzia.pytanie',
      // Model kończy turę pytaniem albo podsumowaniem: oba mają cel „czat-gotowe”.
      target: 'czat-gotowe',
      title: 'AI dopytuje jak człowiek',
      body: [
        'Zamiast długiej ankiety AI zadaje krótkie pytanie o to, czego brakuje w opisie. Odpowiada się jednym kliknięciem albo własnymi słowami.',
      ],
      hint: 'Kliknij jedną z odpowiedzi albo „Zrób to za mnie”.',
      tag: TAG,
      placement: 'top',
      waitFor: { target: 'czat-gotowe', timeoutMs: MODEL, message: 'Model przygotowuje pytanie…' },
      actions: [{ kind: 'click', target: 'czat-odpowiedz' }],
      // Kolejna tura modelu: następne pytanie, podsumowanie albo od razu wyniki.
      advanceOn: { kind: 'appear', target: 'czat-tura', timeoutMs: MODEL },
    },
    {
      id: 'sedzia.pomijamy',
      target: 'czat-ramka',
      title: 'Resztę pytań pomijamy',
      body: [
        'Zwykle AI zadaje jeszcze jedno lub dwa pytania, najwyżej cztery. W demo oszczędzamy czas: „Pokaż wyniki teraz” od razu szuka rozwiązań.',
      ],
      hint: 'Kliknij „Zrób to za mnie” albo „Pokaż wyniki teraz” pod polem tekstowym.',
      tag: TAG,
      placement: 'top',
      waitFor: { target: 'czat-tura', timeoutMs: MODEL, message: 'Model analizuje Twoją odpowiedź…' },
      actions: [{ kind: 'click', target: 'czat-wyniki-teraz' }],
      advanceOn: { kind: 'appear', target: 'czat-wynik', timeoutMs: MODEL },
    },
    {
      id: 'sedzia.wyniki',
      target: 'czat-wynik',
      title: 'Do pięciu sprawdzonych rozwiązań',
      body: [
        'To prawdziwe innowacje z bazy ROPS, które już działają w Małopolsce. Na 35 testowych zgłoszeniach trafna była w pierwszej trójce za każdym razem.',
      ],
      hint: 'Kliknij „Dalej”.',
      tag: TAG,
      placement: 'auto',
      waitFor: { target: 'czat-wynik', timeoutMs: MODEL, message: 'Model dobiera innowacje z bazy…' },
    },
    {
      id: 'sedzia.dlaczego',
      target: 'czat-dlaczego',
      title: 'Wiadomo, dlaczego to pasuje',
      body: [
        'Każdy wynik ma uzasadnienie napisane pod Twój problem, oparte na karcie innowacji. Nie trzeba zgadywać, czemu coś jest na liście.',
      ],
      hint: 'Przeczytaj uzasadnienie i kliknij „Dalej”.',
      tag: TAG,
      placement: 'auto',
    },
    {
      id: 'sedzia.karta',
      target: 'czat-wynik-akcje',
      title: 'Otwórz pełną kartę',
      body: ['„Szczegóły i kontakt” prowadzi do pełnej karty innowacji. Zajrzyjmy.'],
      hint: 'Kliknij „Szczegóły i kontakt” albo „Zrób to za mnie”.',
      tag: TAG,
      placement: 'auto',
      actions: [
        { kind: 'capture', target: 'czat-wynik-link', key: 'innowacja.slug', from: 'href', pattern: '/innowacja/([^/?#]+)' },
        { kind: 'click', target: 'czat-wynik-link' },
      ],
      advanceOn: { kind: 'route', startsWith: '/innowacja/' },
    },
    {
      id: 'sedzia.innowacja',
      target: 'innowacja-opis',
      title: 'Wszystko o rozwiązaniu w jednym miejscu',
      body: [
        'Na czym polega, dla kogo, czy działa, ile kosztuje i kogo pytać. Jednym kliknięciem: opis prostym językiem przez AI, czytanie na głos, porównanie kart i karta wdrożenia dla Twojej instytucji.',
      ],
      hint: 'Kliknij „Dalej”.',
      tag: 'Moduł II i VII',
      placement: 'auto',
      waitFor: { target: 'innowacja-opis', timeoutMs: 15_000, message: 'Otwieram kartę innowacji…' },
    },
    {
      id: 'sedzia.reszta',
      title: 'To dopiero początek',
      body: [
        'Splot ma wszystkie 7 modułów zadania: wyszukiwarkę, Zasobnik wiedzy, Kreator pomysłów, Tester, Middleman, kontakt z ROPS i panel pracownika z AI pod kontrolą człowieka.',
        'Całość jest dostępna: trzy motywy, większy tekst, czytanie na głos i obsługa klawiaturą.',
      ],
      tag: 'Wszystkie moduły',
    },
    {
      id: 'sedzia.pelny',
      target: 'przewodnik-przycisk',
      title: 'Cały projekt w pełnym przewodniku',
      body: [
        'Wszystko, co pokazaliśmy i dużo więcej, jest w pełnym przewodniku: 10 rozdziałów, każdy na żywo, łącznie z panelem ROPS.',
        'Po kliknięciu „Zakończ rozdział” otworzy się spis rozdziałów. Wybierz dowolny.',
      ],
      hint: 'Pełny przewodnik zawsze otworzysz przyciskiem „Przewodnik”.',
      tag: 'Pełny przewodnik',
      placement: 'bottom',
    },
  ],
}

export default chapter
