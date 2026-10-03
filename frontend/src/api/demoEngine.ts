import type { ChatEvent, ChatRequest, ProblemField, ProblemState, Question, Role } from '@/types/chat'
import { ROLE_LABELS } from '@/types/chat'
import { search } from '@/lib/search'

// Tryb demonstracyjny: emuluje backend z docs/DEMO.md (te same zdarzenia SSE),
// dopóki endpoint /chat nie jest gotowy. Reguły jak dla modelu:
// pyta tylko o brakujące pola, maksymalnie MAX_ROUNDS rund, potem podsumowanie.

const MAX_ROUNDS = 3

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function* streamText(text: string): AsyncGenerator<ChatEvent> {
  const words = text.split(/(?<=\s)/)
  for (let i = 0; i < words.length; i += 3) {
    yield { type: 'text', delta: words.slice(i, i + 3).join('') }
    await sleep(35)
  }
}

function detectRole(text: string): Role {
  if (/\b(wójt|burmistrz|prezydent miasta|starost|radn|urzędzie gminy|naszej gminie|naszym mieście|samorząd)/i.test(text)) return 'jst'
  if (/\b(MOPS|GOPS|OPS|CUS|pracownik socjal|podopieczn|ośrodku pomocy)/.test(text)) return 'ops'
  if (/fundacj|stowarzysz|organizacj[aię] pozarząd|\bNGO\b|wolontariusz/i.test(text)) return 'ngo'
  if (/badam|ekspert|naukow|uczelni/i.test(text)) return 'ekspert'
  return 'mieszkaniec'
}

const AUDIENCE: [RegExp, string][] = [
  [/senior|mam[aąy]\b|mamę|tat[aąy]\b|tatę|babci|dziadk|starsz|emeryt/i, 'Osoby starsze'],
  [/głuch|niesłysz|słabosłysz|PJM/i, 'Osoby Głuche lub słabosłyszące'],
  [/niewidom|słabowidz/i, 'Osoby niewidome lub słabowidzące'],
  [/wózk|niepełnospraw.*ruch|porusza/i, 'Osoby z ograniczoną mobilnością'],
  [/dziec|syn\b|synem|córk|nastolat|uczni|młodzież/i, 'Dzieci i młodzież'],
  [/cudzoziem|migrant|uchodźc/i, 'Cudzoziemcy'],
  [/bezdomn/i, 'Osoby w kryzysie bezdomności'],
]

const CAUSE: [RegExp, string][] = [
  [/demencj|pamię|zapomin|otępien/i, 'Problemy z pamięcią'],
  [/samotn|izolac|nie wychodzi|brak kontaktu/i, 'Samotność i brak kontaktu z innymi'],
  [/formularz|urzędow|trudnym językiem|nie rozumiem/i, 'Niezrozumiałe dokumenty, bariera językowa'],
  [/zakup|wózk|schod|porusza/i, 'Bariery w poruszaniu się'],
  [/prac[aęy]\b|bezroboc|zatrudni/i, 'Brak pracy lub aktywizacji zawodowej'],
]

function extract(text: string): ProblemState {
  const fields: ProblemState = {}
  const audience = AUDIENCE.find(([re]) => re.test(text))
  if (audience) fields.kogo = audience[1]
  const cause = CAUSE.find(([re]) => re.test(text))
  if (cause) fields.przyczyna = cause[1]
  const place = text.match(/\b(?:w|we)\s+(gminie|mieście|powiecie)\s+([A-ZŁŚŻŹĆ][\wąćęłńóśźż-]+)/)
  if (place) fields.gdzie = `${place[1] === 'gminie' ? 'Gmina' : place[1] === 'mieście' ? 'Miasto' : 'Powiat'} ${place[2]}`
  else if (/\bna wsi\b|wiejsk/i.test(text)) fields.gdzie = 'Obszar wiejski'
  return fields
}

function questionFor(field: ProblemField, role: Role): Question | null {
  const institutional = role !== 'mieszkaniec'
  switch (field) {
    case 'kogo':
      return { id: 'kogo', field, text: 'Kogo dotyczy ten problem?', options: ['Osoby starsze', 'Dzieci i młodzież', 'Osoby z niepełnosprawnością', 'Rodziny', 'Mieszkańcy całej okolicy'] }
    case 'przyczyna':
      return { id: 'przyczyna', field, text: 'Co jest największą trudnością?', options: ['Samotność i brak kontaktu z innymi', 'Problemy z pamięcią', 'Bariery w poruszaniu się', 'Niezrozumiałe dokumenty lub informacje'] }
    case 'skala':
      return institutional
        ? { id: 'skala', field, text: 'Ilu osób może to dotyczyć?', options: ['Kilku–kilkunastu osób', 'Kilkudziesięciu osób', 'Kilkuset osób lub więcej'] }
        : { id: 'skala', field, text: 'Jak często ten problem utrudnia życie?', options: ['Codziennie', 'Kilka razy w tygodniu', 'Od czasu do czasu'] }
    case 'proby':
      return { id: 'proby', field, text: 'Czy próbowano już coś z tym zrobić?', options: ['Jeszcze nic', 'Pomoc rodziny lub sąsiadów', 'Wsparcie ośrodka pomocy społecznej', 'Zajęcia lub usługi w gminie'] }
    case 'zasoby':
      return { id: 'zasoby', field, text: 'Jakimi zasobami dysponujecie?', options: ['Mamy budżet na wdrożenie', 'Mamy ludzi, ale mały budżet', 'Szukamy rozwiązania bez kosztów', 'Nie wiem'] }
    case 'gdzie':
      return { id: 'gdzie', field, text: 'Gdzie to się dzieje?', options: ['W dużym mieście', 'W małym mieście', 'Na wsi'] }
    default:
      return null
  }
}

// Kolejność pytań zależy od roli (rola wpływa na sposób prowadzenia rozmowy)
const QUESTION_ORDER: Record<Role, ProblemField[]> = {
  mieszkaniec: ['kogo', 'przyczyna', 'skala', 'proby'],
  jst: ['kogo', 'skala', 'zasoby', 'proby'],
  ngo: ['kogo', 'skala', 'zasoby', 'przyczyna'],
  ops: ['kogo', 'skala', 'proby', 'przyczyna'],
  ekspert: ['kogo', 'skala', 'przyczyna'],
}

function buildSummary(problem: ProblemState, role: Role): string {
  const parts = [`Piszesz jako: ${ROLE_LABELS[role]}.`]
  if (problem.opis) parts.push(`Problem: ${problem.opis}`)
  if (problem.kogo) parts.push(`Dotyczy: ${problem.kogo.toLowerCase()}.`)
  if (problem.gdzie) parts.push(`Miejsce: ${problem.gdzie}.`)
  if (problem.skala) parts.push(`Skala: ${problem.skala.toLowerCase()}.`)
  if (problem.przyczyna) parts.push(`Główna trudność: ${problem.przyczyna.toLowerCase()}.`)
  if (problem.proby) parts.push(`Dotychczas: ${problem.proby.toLowerCase()}.`)
  if (problem.zasoby) parts.push(`Zasoby: ${problem.zasoby.toLowerCase()}.`)
  return parts.join(' ')
}

async function* runSearch(problem: ProblemState, role: Role): AsyncGenerator<ChatEvent> {
  const { default: data } = await import('virtual:innowacje')
  const result = search(data, problem, role)
  if (!result.items.length) {
    yield* streamText('Nie znalazłem w bazie żadnej pozycji związanej z tym opisem. Spróbuj opisać problem innymi słowami.')
    yield { type: 'results', items: [], no_match: true }
    return
  }
  yield* streamText(
    result.no_match
      ? 'Mówię wprost: w bazie nie ma rozwiązania, które dokładnie odpowiada Twojemu problemowi. Poniżej pokazuję najbliższe pozycje i to, czym się różnią.'
      : `Znalazłem ${result.items.length} ${result.items.length === 1 ? 'rozwiązanie' : 'rozwiązania'} pasujące do Twojego opisu. Wyniki są pod rozmową — przy każdym wyjaśniam, dlaczego pasuje.`,
  )
  yield { type: 'results', items: result.items, no_match: result.no_match }
}

export async function* runDemo(req: ChatRequest): AsyncGenerator<ChatEvent> {
  await sleep(250)
  const userTexts = req.messages.filter((m) => m.role === 'user').map((m) => m.content)
  const last = userTexts[userTexts.length - 1] ?? ''
  let role = req.role
  const problem: ProblemState = { ...req.problem }

  if (req.action === 'show_results_now' || req.action === 'confirm_summary') {
    if (req.summary) problem.opis = problem.opis ?? req.summary
    yield* runSearch(problem, role ?? 'mieszkaniec')
    return
  }

  if (!role) {
    role = detectRole(userTexts.join(' '))
    yield { type: 'role', role }
  }

  // Nowa informacja z rozmowy → aktualizacja panelu „Twój problem”
  const update: ProblemState = {}
  if (req.action === 'answer' && req.question_id) {
    update[req.question_id as ProblemField] = last
  } else if (req.action === 'message') {
    if (!problem.opis) update.opis = last
    for (const [k, v] of Object.entries(extract(last)) as [ProblemField, string][]) {
      if (!problem[k]) update[k] = v
    }
  }
  if (Object.keys(update).length) {
    Object.assign(problem, update)
    yield { type: 'problem_update', fields: update }
  }

  const missing = QUESTION_ORDER[role].filter((f) => !problem[f])
  if (req.rounds < MAX_ROUNDS && missing.length) {
    const q = questionFor(missing[0], role)!
    const intro = req.action === 'change_role'
      ? `Dobrze, będę prowadzić rozmowę z perspektywy: ${ROLE_LABELS[role].toLowerCase()}. `
      : req.rounds === 0 ? 'Dziękuję. Zadam kilka krótkich pytań, żeby lepiej dopasować wyniki. ' : ''
    yield* streamText(`${intro}${q.text}`)
    yield { type: 'question', question: q }
    return
  }

  yield* streamText('Mam już wystarczająco informacji. Sprawdź podsumowanie i potwierdź je albo popraw, zanim zacznę szukać.')
  yield { type: 'summary', text: buildSummary(problem, role) }
}
