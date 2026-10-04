import type { TourChapter } from '@/tour/types'

// Zgłoszenie #1 z zestawu testowego (mama z demencją) z dopisaną gminą, żeby na żywo pokazały się też dane gminy.
// Na próbach model trafia w nim w rolę „mieszkaniec”, zadaje 1–2 pytania i daje 5 wyników (w każdym było „Kody QR na pomoc seniorom”).
const PRZYKLADOWE_ZGLOSZENIE =
  'Mama ma początki demencji i dzwoni do mnie po 10 razy dziennie, bo nie pamięta, czy brała leki i gdzie są klucze. ' +
  'Mieszkamy w gminie Wieliczka. Nie mogę być przy niej cały dzień, a do DPS-u nie chce iść. ' +
  'Szukam czegoś prostego, co jej pomoże w domu.'

const MODEL_MA_GLOS = 90_000
const TAG = 'Moduł I · 10%'

const chapter: TourChapter = {
  id: 'czat',
  title: 'Wyszukiwarka innowacji (czat)',
  module: 'Moduł I',
  summary: 'Rozmowa z AI, która zamienia opis problemu na pasujące innowacje.',
  minutes: 3,
  steps: [
    {
      id: 'czat.pole',
      route: '/',
      target: 'czat-ramka',
      title: 'Opisz problem swoimi słowami',
      body: [
        'To wyszukiwarka innowacji. Piszesz, z czym się mierzysz, a AI dobiera rozwiązania, które już działają w Małopolsce.',
        'Pomaga opiekunowi, pracownikowi OPS i samorządowi.',
      ],
      hint: 'Wpisz kilka zdań albo kliknij „Zrób to za mnie”.',
      tag: TAG,
      placement: 'top',
      actions: [{ kind: 'fill', target: 'czat-pole', value: PRZYKLADOWE_ZGLOSZENIE }],
    },
    {
      id: 'czat.prywatnosc',
      target: 'czat-prywatnosc',
      title: 'Co dzieje się z rozmową',
      body: [
        'Rozmowa nie jest zapisywana w bazie Splotu. Jej treść trafia do zewnętrznego dostawcy modelu AI, żeby mógł odpowiedzieć.',
        'Dlatego nie wpisuj nazwisk, adresów ani innych danych wrażliwych.',
      ],
      hint: 'Przeczytaj zdanie pod polem.',
      tag: 'Prywatność',
      placement: 'top',
    },
    {
      id: 'czat.glos',
      target: 'czat-glos',
      title: 'Mów zamiast pisać',
      body: [
        'Trudno Ci pisać albo wolisz mówić? Kliknij mikrofon i podyktuj opis po polsku.',
        'Tekst trafia do pola, więc możesz go jeszcze poprawić.',
      ],
      hint: 'Chcesz spróbować? Kliknij mikrofon i powiedz jedno zdanie.',
      tag: 'Dostępność',
      placement: 'top',
    },
    {
      id: 'czat.wyslij',
      target: 'czat-wyslij',
      title: 'Wyślij i rozmawiaj na żywo',
      body: [
        'Od teraz odpowiada prawdziwy model AI, więc pierwsza odpowiedź pojawi się po kilku sekundach.',
        'Enter też wysyła opis.',
      ],
      hint: 'Kliknij „Wyślij”.',
      tag: TAG,
      placement: 'top',
      actions: [{ kind: 'click', target: 'czat-wyslij' }],
      advanceOn: { kind: 'appear', target: 'czat-rola', timeoutMs: MODEL_MA_GLOS },
    },
    {
      id: 'czat.rola',
      target: 'czat-rola',
      title: 'AI rozpoznaje Twoją rolę',
      body: [
        'Z opisu model wnioskuje, kim jesteś: mieszkańcem, pracownikiem CUS lub OPS albo samorządem. Od roli zależą pytania i kolejność wyników.',
        'Pomylił się? „Zmień” pozwala wybrać inną.',
      ],
      hint: 'Sprawdź, czy rola się zgadza.',
      tag: TAG,
      placement: 'bottom',
      waitFor: { target: 'czat-rola', timeoutMs: MODEL_MA_GLOS, message: 'Model analizuje Twój opis…' },
    },
    {
      id: 'czat.panel',
      target: 'czat-panel',
      title: 'Twój problem w skrócie',
      body: [
        'Obok rozmowy układa się karta problemu: kogo dotyczy, gdzie, jaka skala, co już próbowano. Świeże wpisy mają znaczek „nowe”.',
        'Od razu widzisz, jak AI Cię zrozumiało.',
      ],
      hint: 'Zerknij, czy wpisy zgadzają się z opisem.',
      tag: TAG,
      placement: 'right',
    },
    {
      id: 'czat.gmina',
      target: 'czat-gmina',
      title: 'Liczby o Twojej gminie',
      body: [
        'Gdy wspomnisz gminę w Małopolsce, Splot dokłada dane z Obserwatora Statystyk Społecznych ROPS. Każda liczba ma rok i link do źródła.',
        'Pomysł oprzesz na faktach.',
      ],
      hint: 'Zobacz rok przy każdym wskaźniku.',
      tag: TAG,
      placement: 'right',
      waitFor: { target: 'czat-gmina', timeoutMs: 30_000, message: 'Model pobiera dane gminy…' },
    },
    {
      id: 'czat.przeczytaj',
      target: 'czat-przeczytaj',
      title: 'Posłuchaj odpowiedzi',
      body: [
        'Pod odpowiedziami AI jest „Przeczytaj”: przeglądarka odczyta tekst na głos.',
        'Przydaje się, gdy słabo widzisz albo wolisz słuchać.',
      ],
      hint: 'Kliknij „Przeczytaj” i posłuchaj pytania.',
      tag: 'Dostępność',
      placement: 'top',
      waitFor: { target: 'czat-przeczytaj', timeoutMs: MODEL_MA_GLOS, message: 'Model analizuje Twój opis…' },
    },
    {
      id: 'czat.pytanie',
      target: 'czat-pytanie',
      title: 'AI dopytuje o szczegóły',
      body: [
        'Gdy czegoś brakuje, model zadaje krótkie pytanie, najwyżej cztery razy w rozmowie. Odpowiadasz kliknięciem albo wybierasz „Inne” i piszesz po swojemu.',
      ],
      hint: 'Wybierz odpowiedź, która pasuje najbardziej.',
      tag: TAG,
      placement: 'top',
      waitFor: { target: 'czat-pytanie', timeoutMs: MODEL_MA_GLOS, message: 'Model przygotowuje pytanie…' },
      actions: [{ kind: 'click', target: 'czat-odpowiedz' }],
    },
    {
      id: 'czat.wyniki-teraz',
      target: 'czat-wyniki-teraz',
      title: 'Nie chcesz czekać? Pokaż wyniki',
      body: [
        'Nie musisz odpowiadać na wszystkie pytania. „Pokaż wyniki teraz” przerywa doprecyzowanie i od razu szuka rozwiązań.',
        'Gdy odpowiesz na wszystko, model sam zaproponuje podsumowanie do zatwierdzenia.',
      ],
      hint: 'Kliknij „Pokaż wyniki teraz”.',
      tag: TAG,
      placement: 'top',
      waitFor: { target: 'czat-pytanie', timeoutMs: MODEL_MA_GLOS, message: 'Model analizuje Twoją odpowiedź…' },
      actions: [{ kind: 'click', target: 'czat-wyniki-teraz' }],
      advanceOn: { kind: 'appear', target: 'czat-wynik', timeoutMs: MODEL_MA_GLOS },
    },
    {
      id: 'czat.wyniki',
      target: 'czat-wynik',
      title: 'Pasujące innowacje',
      body: [
        'Model przeszukuje bazę innowacji ROPS i pokazuje do pięciu. Pierwsza jest najlepiej dopasowana, kolejne ją uzupełniają.',
        'Nie musisz przeglądać setek kart.',
      ],
      hint: 'Przewiń listę i zobacz, co zaproponował model.',
      tag: TAG,
      placement: 'auto',
      waitFor: { target: 'czat-wynik', timeoutMs: MODEL_MA_GLOS, message: 'Model dobiera innowacje z bazy…' },
    },
    {
      id: 'czat.dlaczego',
      target: 'czat-dlaczego',
      title: 'Dlaczego to pasuje',
      body: [
        'Przy każdej innowacji jest uzasadnienie oparte na jej karcie: jak odpowiada na Twój problem i czego wymaga wdrożenie.',
        'Nie zgadujesz, czemu coś jest na liście.',
      ],
      hint: 'Przeczytaj uzasadnienie pierwszej pozycji.',
      tag: TAG,
      placement: 'auto',
    },
    {
      id: 'czat.podobne',
      title: 'Podobne przypadki',
      body: [
        'Gdy co najmniej pięć osób zgłosiło podobną potrzebę, pod wynikami pojawia się liczba takich przypadków i najczęściej polecane innowacje.',
        'Same liczby, bez treści rozmów.',
      ],
      tag: TAG,
    },
    {
      id: 'czat.karta',
      target: 'czat-wynik-akcje',
      title: 'Szczegóły i porównanie',
      body: [
        '„Szczegóły i kontakt” otwiera pełną kartę innowacji. „Porównaj” dodaje ją do zestawienia, w którym zestawisz do trzech pozycji.',
        'Otwórzmy kartę pierwszej innowacji.',
      ],
      hint: 'Kliknij „Szczegóły i kontakt”.',
      tag: TAG,
      placement: 'auto',
      actions: [
        { kind: 'capture', target: 'czat-wynik-link', key: 'innowacja.slug', from: 'href', pattern: '/innowacja/([^/?#]+)' },
        { kind: 'click', target: 'czat-wynik-link' },
      ],
      advanceOn: { kind: 'route', startsWith: '/innowacja/' },
    },
  ],
}

export default chapter
