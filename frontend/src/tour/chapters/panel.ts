import type { TourChapter, TourContext } from '@/tour/types'

// Wszystkie kroki są na żywo i wymagają zalogowania w panelu (admin: true).
// Rekordy z innych rozdziałów (zgłoszenie, opinia, ogłoszenie, pytanie) to najnowsze wpisy na listach moderacji.

interface TicketItem { id: number }
interface TicketPage { items: TicketItem[] }
interface TicketDetail { kategoria: string | null }
interface MentorItem { id: number; aktywny: boolean; obszary: string[] }
interface CardItem { slug: string }
interface CardPage { items: CardItem[] }

/** Zgłoszenie z rozdziału „wspolpraca” (po tokenie wątku), a gdy go brak, najnowsze zgłoszenie w skrzynce. */
async function ticketId(ctx: TourContext): Promise<number | null> {
  const token = ctx.get('watek.token')
  const cacheKey = `panel.zgloszenie.${token ?? 'najnowsze'}`
  const cached = ctx.get(cacheKey)
  if (cached) return Number(cached)
  let id: number | undefined
  if (token) {
    try {
      // API panelu nie szuka po tokenie: pierwsza wiadomość wątku to treść zgłoszenia, po niej znajdujemy rekord.
      const thread = await ctx.api<{ wiadomosci: { tresc: string }[] }>(`/zgloszenia/watek/${encodeURIComponent(token)}`)
      const text = thread.wiadomosci[0]?.tresc.slice(0, 150).trim()
      if (text) {
        const found = await ctx.api<TicketPage>(
          `/admin/zgloszenia?sort=najnowsze&limit=1&q=${encodeURIComponent(text)}`, { admin: true },
        )
        id = found.items[0]?.id
      }
    } catch {
      /* wracamy do najnowszego zgłoszenia */
    }
  }
  if (id === undefined) {
    const latest = await ctx.api<TicketPage>('/admin/zgloszenia?sort=najnowsze&limit=1', { admin: true })
    id = latest.items[0]?.id
  }
  if (id === undefined) return null
  ctx.set(cacheKey, String(id))
  return id
}

async function ticketRoute(ctx: TourContext): Promise<string> {
  const id = await ticketId(ctx)
  return id === null ? '/admin' : `/admin/zgloszenia/${id}`
}

/** Mentor z obszaru zgłoszenia, a gdy takiego nie ma, pierwszy aktywny. */
async function mentorChoice(ctx: TourContext): Promise<string> {
  const id = await ticketId(ctx)
  const [mentors, ticket] = await Promise.all([
    ctx.api<MentorItem[]>('/admin/mentorzy', { admin: true }),
    id === null ? Promise.resolve<TicketDetail | null>(null) : ctx.api<TicketDetail>(`/admin/zgloszenia/${id}`, { admin: true }),
  ])
  const active = mentors.filter((m) => m.aktywny)
  const best = active.find((m) => ticket?.kategoria && m.obszary.includes(ticket.kategoria)) ?? active[0]
  return best ? String(best.id) : ''
}

/** Karta do pokazania edycji: najnowszy szkic (np. z importu), a gdy go brak, pierwsza karta z listy. */
async function cardRoute(ctx: TourContext): Promise<string> {
  const drafts = await ctx.api<CardPage>('/admin/karty?status=szkic&limit=1', { admin: true })
  const page = drafts.items.length ? drafts : await ctx.api<CardPage>('/admin/karty?limit=1', { admin: true })
  const slug = page.items[0]?.slug
  return slug ? `/admin/karty/${slug}` : '/admin/karty'
}

const chapter: TourChapter = {
  id: 'panel',
  title: 'Panel pracownika ROPS',
  module: 'Moduł VI',
  summary: 'Skrzynka zgłoszeń z AI, karty, importy, radar, nabory i moderacja.',
  minutes: 8,
  steps: [
    {
      id: 'panel.start',
      route: '/admin',
      target: 'panel-skrzynka-tytul',
      admin: true,
      title: 'Panel pracownika ROPS',
      body: [
        'To zaplecze Splotu: tu pracownik ROPS odpowiada ludziom, sprawdza podpowiedzi AI i decyduje, co trafia do publicznej bazy.',
        'Wszystko, co robisz w panelu, ma skutek na żywo.',
      ],
      hint: 'Na stacku demo przewodnik loguje się sam. Jeśli poprosi o token, wpisz go w formularzu.',
      tag: 'Moduł VI',
      placement: 'bottom',
    },
    {
      id: 'panel.skrzynka',
      route: '/admin',
      target: 'panel-skrzynka-filtry',
      admin: true,
      title: 'Skrzynka zgłoszeń',
      body: [
        'Zgłoszenia ludzi czekają w jednej skrzynce. Najpilniejsze i najdłużej czekające są na górze, a przy każdym widać, ile zostało do terminu odpowiedzi.',
        'Dzięki filtrom nic nie ginie.',
      ],
      hint: 'Zobacz tylko pilne: wybierz pilność „Wysoka”.',
      tag: 'SLA',
      placement: 'bottom',
      actions: [{ kind: 'select', target: 'panel-filtr-pilnosc', value: 'wysoka' }],
    },
    {
      id: 'panel.zgloszenie',
      route: ticketRoute,
      target: 'panel-zgloszenie-tresc',
      admin: true,
      title: 'Otwieramy zgłoszenie',
      body: [
        'Pracownik widzi dokładnie to, co napisał autor, razem z datą i statusem. Jeśli wysłałeś zgłoszenie w poprzednim rozdziale, to jest ono.',
        'Po otwarciu AI od razu zaczyna analizę.',
      ],
      tag: 'Moduł VI',
      placement: 'bottom',
    },
    {
      id: 'panel.analiza',
      target: 'panel-analiza',
      admin: true,
      title: 'Analiza AI na żywo',
      body: [
        'Model sam ocenia obszar i pilność zgłoszenia oraz szuka podobnych zgłoszeń, żeby nikt nie odpowiadał dwa razy na to samo.',
        'To podpowiedź, nie wyrok. Człowiek ją sprawdza.',
      ],
      tag: 'AI pod kontrolą człowieka',
      placement: 'left',
      waitFor: { target: 'panel-analiza', timeoutMs: 90000, message: 'AI czyta zgłoszenie. To potrwa kilkanaście sekund.' },
    },
    {
      id: 'panel.dopasowanie',
      target: 'panel-analiza-karty',
      admin: true,
      title: 'Pasujące innowacje z powodami',
      body: [
        'Pod analizą widzisz karty z bazy ROPS, które pasują do problemu, z procentem dopasowania. Każda ma powód: wspólne tagi, np. grupa odbiorców.',
        'Pracownik wie, dlaczego AI to poleca.',
      ],
      tag: 'AI pod kontrolą człowieka',
      placement: 'left',
    },
    {
      id: 'panel.szkic',
      target: 'panel-odpowiedz-tekst',
      admin: true,
      title: 'Szkic odpowiedzi od AI',
      body: [
        'AI przygotowało szkic odpowiedzi, który powołuje się tylko na prawdziwe karty z bazy. Nic nie wyjdzie na zewnątrz, dopóki człowiek go nie zatwierdzi.',
      ],
      hint: 'Przeczytaj szkic. Możesz go dowolnie zmienić.',
      tag: 'AI pod kontrolą człowieka',
      placement: 'right',
      waitFor: { target: 'panel-odpowiedz-tekst', timeoutMs: 90000, message: 'AI pisze szkic odpowiedzi…' },
    },
    {
      id: 'panel.odpowiedz',
      target: 'panel-rozmowa',
      admin: true,
      title: 'Wysyłamy odpowiedź do autora',
      body: [
        'Zatwierdzenie wymaga potwierdzenia. Odpowiedź trafia do prywatnego wątku autora, pod jego link, a e-mail dostanie tylko, jeśli go podał.',
        'Tu pojawi się w rozmowie.',
      ],
      hint: 'Kliknij „Zrób to za mnie”, a wyślemy odpowiedź [demo].',
      tag: 'Moduł V',
      placement: 'left',
      actions: [
        {
          kind: 'fill',
          target: 'panel-odpowiedz-tekst',
          value: 'Dzień dobry, dziękujemy za zgłoszenie. Przeczytaliśmy je uważnie i wskazaliśmy w bazie rozwiązania, które mogą pomóc. Jeśli chcesz porozmawiać z mentorem, napisz tutaj. Zespół ROPS [demo]',
        },
        { kind: 'click', target: 'panel-odpowiedz-zatwierdz' },
        { kind: 'click', target: 'panel-odpowiedz-potwierdz' },
      ],
    },
    {
      id: 'panel.mentor',
      target: 'panel-mentor',
      admin: true,
      title: 'Przydział mentora',
      body: [
        'Gdy autor potrzebuje człowieka, ROPS przydziela mentora z jego obszaru. Mentorzy z pasującą specjalnością są na górze listy.',
        'Mentor dostaje link do sprawy.',
      ],
      hint: 'Kliknij „Zrób to za mnie”, a wybierzemy mentora.',
      tag: 'Moduł V',
      placement: 'left',
      actions: [
        { kind: 'select', target: 'panel-mentor-wybor', value: mentorChoice },
        { kind: 'click', target: 'panel-mentor-przydziel' },
      ],
    },
    {
      id: 'panel.powiadomienia',
      route: '/admin/powiadomienia',
      target: 'panel-powiadomienia',
      admin: true,
      title: 'Powiadomienia',
      body: [
        'Każde nowe zgłoszenie, pytanie czy ogłoszenie zostawia tu ślad. Licznik w zakładce pokazuje, co jeszcze czeka.',
        'Kliknięcie wpisu prowadzi prosto do sprawy.',
      ],
      tag: 'Moduł VI',
      placement: 'bottom',
    },
    {
      id: 'panel.import',
      route: '/admin/importy',
      target: 'panel-import-formularz',
      admin: true,
      title: 'Dokument zamienia się w kartę',
      body: [
        'Wgraj opis projektu (PDF lub DOCX), a AI przygotuje szkic karty innowacji. Każde pole ma cytat z dokumentu, a to, czego w nim nie ma, zostaje puste.',
      ],
      hint: 'Kliknij „Zrób to za mnie”, a wgramy przykładowy opis projektu „Autobus zdrowia”.',
      tag: 'AI pod kontrolą człowieka',
      placement: 'top',
      actions: [
        { kind: 'upload', target: 'panel-import-plik', url: '/demo/dokument-projektu-1-autobus-zdrowia.docx', filename: 'dokument-projektu-1-autobus-zdrowia.docx' },
        { kind: 'click', target: 'panel-import-wyslij' },
      ],
      advanceOn: { kind: 'route', startsWith: '/admin/importy/' },
    },
    {
      id: 'panel.import-szkic',
      target: 'panel-import-szkic',
      admin: true,
      title: 'Szkic karty z cytatami',
      body: [
        'AI przeczytało dokument i przygotowało szkic karty. Obok każdego pola widać fragment, z którego pochodzi, więc łatwo sprawdzić, czy niczego nie zmyśliło.',
      ],
      hint: 'Przejrzyj pola i cytaty. Publikację zawsze zatwierdza pracownik ROPS.',
      tag: 'AI pod kontrolą człowieka',
      waitFor: { target: 'panel-import-szkic', timeoutMs: 90000, message: 'AI czyta dokument…' },
    },
    {
      id: 'panel.karta',
      route: cardRoute,
      target: 'panel-karta-status',
      admin: true,
      title: 'Edycja i publikacja karty',
      body: [
        'Pracownik poprawia treść karty, ustawia poziom dowodu skuteczności i zmienia status. Dopiero „Opublikowana” trafia do wyszukiwarki i czatu.',
      ],
      hint: 'Zobacz opcje statusu. Nic nie zapisujemy.',
      tag: 'Moduł VI',
      placement: 'right',
    },
    {
      id: 'panel.radar',
      route: '/admin/radar',
      target: 'panel-radar-tytul',
      admin: true,
      title: 'Radar: czego brakuje',
      body: [
        'Zgłoszenia bez dobrej odpowiedzi w bazie łączą się w grupy podobnych potrzeb, z trendem tygodniowym.',
        'To mapa luk: wiesz, jakich innowacji szukać, a z grupy zrobisz notatkę dla ROPS.',
      ],
      tag: 'Moduł II',
      placement: 'bottom',
    },
    {
      id: 'panel.nabory',
      route: '/admin/nabory',
      target: 'panel-nabory-dodaj',
      admin: true,
      title: 'Nabory dla kreatora',
      body: [
        'Tu ROPS dodaje nabory grantowe: terminy, pola wniosku i kryteria. Generator wniosku w Kreatorze działa tylko, gdy nabór trwa.',
      ],
      hint: 'Zajrzyj do listy naborów poniżej.',
      tag: 'Moduł III',
      placement: 'bottom',
    },
    {
      id: 'panel.opinie',
      route: '/admin/opinie',
      target: 'panel-opinie-publikuj',
      admin: true,
      title: 'Moderacja opinii testerów',
      body: [
        'Opinie instytucji trafiają najpierw tutaj. Publicznie widać je dopiero po zatwierdzeniu, a wtedy podnoszą poziom dowodu karty.',
      ],
      hint: 'Kliknij „Zrób to za mnie”, a opublikujemy opinię z rozdziału o testerze [demo].',
      tag: 'Moduł IV',
      placement: 'left',
      actions: [{ kind: 'click', target: 'panel-opinie-publikuj' }],
    },
    {
      id: 'panel.partnerstwa',
      route: '/admin/partnerstwa',
      target: 'panel-partnerstwa-publikuj',
      admin: true,
      title: 'Moderacja ogłoszeń partnerskich',
      body: [
        'Ogłoszenia instytucji trafiają na giełdę po sprawdzeniu przez ROPS. Niżej są rozmowy stron, które możesz zamknąć, gdy ktoś nadużywa kanału.',
      ],
      hint: 'Kliknij „Zrób to za mnie”, a opublikujemy ogłoszenie [demo].',
      tag: 'Moduł V',
      placement: 'left',
      actions: [{ kind: 'click', target: 'panel-partnerstwa-publikuj' }],
    },
    {
      id: 'panel.mentorzy',
      route: '/admin/mentorzy',
      target: 'panel-mentorzy-dodaj',
      admin: true,
      title: 'Lista mentorów',
      body: [
        'Tu ROPS dodaje mentorów, opisuje ich obszary i powiat oraz wyłącza tych, którzy chwilowo nie mogą pomagać. Adres e-mail nie jest publiczny.',
      ],
      hint: 'Kliknij „Dodaj mentora”, żeby zobaczyć formularz.',
      tag: 'Moduł V',
      placement: 'bottom',
    },
    {
      id: 'panel.pytania',
      route: '/admin/pytania',
      target: 'panel-pytania-odpowiedz',
      admin: true,
      title: 'Odpowiedź na pytanie',
      body: [
        'Pytania zadane publicznie czekają na odpowiedź ROPS. Pracownik może poprawić treść pytania, np. usunąć dane osobowe, i napisać odpowiedź.',
      ],
      hint: 'Kliknij „Zrób to za mnie”, a odpowiemy na pytanie z rozdziału o sieci [demo].',
      tag: 'Moduł V',
      placement: 'top',
      actions: [
        {
          kind: 'fill',
          target: 'panel-pytania-odpowiedz',
          value: 'Dziękujemy za pytanie. W bazie ROPS znajdziesz karty rozwiązań, które pomagają w takich sytuacjach, a mentor chętnie podpowie, od czego zacząć. Zespół ROPS [demo]',
        },
        { kind: 'click', target: 'panel-pytania-zapisz' },
      ],
    },
    {
      id: 'panel.faq',
      route: '/admin/pytania',
      target: 'panel-pytania-filtr',
      admin: true,
      title: 'Publikacja w FAQ',
      body: [
        'Odpowiedź trafia do publicznego FAQ tylko wtedy, gdy autor się na to zgodził. Wtedy każdy zobaczy ją na stronie z pytaniami.',
      ],
      hint: 'Kliknij „Zrób to za mnie”, a opublikujemy odpowiedź [demo].',
      tag: 'Moduł V',
      placement: 'bottom',
      actions: [
        { kind: 'select', target: 'panel-pytania-filtr', value: 'odpowiedziane' },
        { kind: 'click', target: 'panel-pytania-publikuj' },
      ],
    },
  ],
}

export default chapter
