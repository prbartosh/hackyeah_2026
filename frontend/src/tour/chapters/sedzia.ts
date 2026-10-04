import type { TourChapter } from '@/tour/types'

// Przewodnik dla sędziego: ok. 2 minuty, najważniejsza funkcja (czat) na żywo, na końcu odesłanie do pełnego przewodnika.
// Te same cele co rozdział „czat”. To samo zgłoszenie (#1 z zestawu testowego), model odpowiada w ok. 20–30 s łącznie.
const ZGLOSZENIE =
  'Mama ma początki demencji i dzwoni do mnie po 10 razy dziennie, bo nie pamięta, czy brała leki i gdzie są klucze. ' +
  'Mieszkamy w gminie Wieliczka. Nie mogę być przy niej cały dzień, a do DPS-u nie chce iść. ' +
  'Szukam czegoś prostego, co jej pomoże w domu.'

const MODEL = 90_000
const TAG = 'Moduł I · 10%'

const chapter: TourChapter = {
  id: 'sedzia',
  title: 'Splot w 2 minuty',
  summary: 'Najważniejsza funkcja na żywo: opis problemu, pytania AI i dopasowane innowacje.',
  minutes: 2,
  standalone: true,
  strict: true,
  steps: [
    {
      id: 'sedzia.witaj',
      route: '/',
      title: 'Splot w 2 minuty',
      body: [
        'ROPS Kraków ma bibliotekę ponad stu sprawdzonych innowacji społecznych, ale trudno w niej znaleźć coś na swój problem.',
        'Splot to robi: opisujesz sprawę swoimi słowami, a AI dobiera rozwiązania. Pokażemy to na żywo.',
      ],
      hint: 'Kliknij „Dalej”. W każdym kroku możesz też kliknąć „Zrób to za mnie”.',
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
      hint: 'Zobacz, jak AI streściło opis.',
      tag: TAG,
      placement: 'right',
      waitFor: { target: 'czat-rola', timeoutMs: MODEL, message: 'Model analizuje opis, to kilka sekund…' },
    },
    {
      id: 'sedzia.pytanie',
      // Model kończy turę pytaniem albo podsumowaniem: oba mają cel „czat-gotowe”, więc krok nie utknie.
      target: 'czat-gotowe',
      title: 'Krótkie pytanie zamiast ankiety',
      body: [
        'Gdy czegoś brakuje, AI dopytuje, najwyżej cztery razy. Odpowiada się jednym kliknięciem.',
        'Teraz pominiemy pytania i od razu poprosimy o wyniki.',
      ],
      hint: 'Kliknij „Zrób to za mnie” albo „Pokaż wyniki teraz” pod polem tekstowym.',
      tag: TAG,
      placement: 'top',
      waitFor: { target: 'czat-gotowe', timeoutMs: MODEL, message: 'Model kończy odpowiedź…' },
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
      hint: 'Przewiń listę wyników.',
      tag: TAG,
      placement: 'auto',
      waitFor: { target: 'czat-wynik', timeoutMs: MODEL, message: 'Model dobiera innowacje z bazy…' },
    },
    {
      id: 'sedzia.dlaczego',
      target: 'czat-dlaczego',
      title: 'Wiadomo, dlaczego to pasuje',
      body: [
        'Każdy wynik ma uzasadnienie z karty innowacji. Dalej jest pełna karta, porównanie, karta wdrożenia dla instytucji i kontakt z ROPS bez zakładania konta.',
      ],
      hint: 'Przeczytaj uzasadnienie pierwszej pozycji.',
      tag: TAG,
      placement: 'auto',
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
