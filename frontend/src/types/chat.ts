// Kontrakt czatu = backend/app/schemas/chat.py (main, ADR 0004 §3 i §7, ADR 0005).
// Przy zmianach schematu po stronie backendu poprawiaj ten plik.

/** Role z ADR 0004 §3. `partner` to JST, NGO albo ekspert. */
export type Role = 'mieszkaniec' | 'cus-ops' | 'partner'

export const ROLE_LABELS: Record<Role, string> = {
  mieszkaniec: 'Mieszkaniec lub opiekun',
  'cus-ops': 'Pracownik CUS / OPS',
  partner: 'Samorząd, NGO lub ekspert',
}

export type PoziomKosztu = 'niski' | 'sredni' | 'wysoki'

export interface PoleProblemu {
  tekst: string | null
  slugi: string[]
}

export interface PoleZasoby extends PoleProblemu {
  poziom_kosztu: PoziomKosztu | null
}

/** Panel „Twój problem” (ADR 0004 §7). W panelu pokazujemy tylko `tekst`. */
export interface ProblemState {
  grupy_docelowe: PoleProblemu
  problemy: PoleProblemu
  miejsca: PoleProblemu
  skale: PoleProblemu
  zasoby: PoleZasoby
  proby: PoleProblemu
}

export type ProblemKey = keyof ProblemState

/** Kolejność i nazwy pól panelu (DEMO.md, ADR 0004 §3). */
export const PROBLEM_FIELDS: { key: ProblemKey; label: string }[] = [
  { key: 'grupy_docelowe', label: 'Kogo dotyczy' },
  { key: 'miejsca', label: 'Gdzie' },
  { key: 'skale', label: 'Skala' },
  { key: 'problemy', label: 'Przyczyna' },
  { key: 'proby', label: 'Co próbowano' },
  { key: 'zasoby', label: 'Zasoby' },
]

export const emptyProblem = (): ProblemState => ({
  grupy_docelowe: { tekst: null, slugi: [] },
  problemy: { tekst: null, slugi: [] },
  miejsca: { tekst: null, slugi: [] },
  skale: { tekst: null, slugi: [] },
  zasoby: { tekst: null, slugi: [], poziom_kosztu: null },
  proby: { tekst: null, slugi: [] },
})

export interface ChatState extends ProblemState {
  rola: Role | null
  /** true, gdy użytkownik sam zmienił rolę przyciskiem „Zmień” — model jej nie nadpisuje */
  role_locked: boolean
  rounds: number
}

export const initialState = (): ChatState => ({ ...emptyProblem(), rola: null, role_locked: false, rounds: 0 })

export type ChatAction = 'show_results_now' | 'confirm_summary'

/**
 * Tekst wiadomości użytkownika w historii dla akcji z przycisków. Backend zna te same napisy
 * (ACTION_MESSAGES w services/chat.py). Front dopisuje je do historii sam, żeby wiadomości
 * user/assistant szły na zmianę — inaczej kolejne zapytanie dostanie 422.
 */
export const ACTION_HISTORY_TEXT: Record<ChatAction, string> = {
  show_results_now: '[Użytkownik kliknął „Pokaż wyniki teraz”]',
  confirm_summary: '[Użytkownik potwierdził podsumowanie]',
}

export interface ApiMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Limity z backendu (schemas/chat.py) */
export const MAX_MESSAGES = 30
export const MAX_USER_MESSAGE_CHARS = 1500
export const MAX_MESSAGE_CHARS = 4000
export const MAX_HISTORY_CHARS = 20_000

export interface ChatRequest {
  messages: ApiMessage[]
  state: ChatState
  action?: ChatAction
  /** Podsumowanie poprawione przez użytkownika, razem z action = 'confirm_summary' */
  summary?: string
}

export interface Question {
  text: string
  options: string[]
}

export type MatchKind = 'main' | 'complementary'

export interface ResultItem {
  slug: string
  nazwa: string
  match: MatchKind
  why_relevant: string
  kategorie: string[]
  wybrana_do_upowszechniania: boolean
  url_zrodlowy: string
  materialy_url: string | null
  pdf_url: string | null
  youtube_url: string | null
  obraz_url: string | null
  organizacja: string | null
  licencja: string | null
}

export interface Results {
  no_good_match: boolean
  note: string | null
  items: ResultItem[]
}

export type ServerEvent =
  | { name: 'text'; data: { text: string } }
  | { name: 'status'; data: { text: string } }
  | { name: 'role'; data: { rola: Role } }
  | { name: 'problem_update'; data: { problem: ProblemState } }
  | { name: 'question'; data: Question }
  | { name: 'summary'; data: { summary: string; problem: ProblemState } }
  | { name: 'results'; data: Results }
  | { name: 'done'; data: { assistant_message: string; state: ChatState } }
  | { name: 'error'; data: { message: string } }
