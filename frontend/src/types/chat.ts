// Kontrakt czatu = backend/app/schemas/chat.py (gałąź ai-flow, ADR 0004).
// Przy zmianach schematu po stronie backendu poprawiaj ten plik.

export type Role = 'mieszkaniec' | 'ngo' | 'jst' | 'cus_ops' | 'ekspert'

export const ROLE_LABELS: Record<Role, string> = {
  mieszkaniec: 'Mieszkaniec lub opiekun',
  ngo: 'Organizacja pozarządowa (NGO)',
  jst: 'Samorząd (JST)',
  cus_ops: 'Pracownik CUS / OPS',
  ekspert: 'Ekspert',
}

export type ProblemKey = 'kogo_dotyczy' | 'gdzie' | 'skala' | 'przyczyna' | 'co_probowano' | 'zasoby'

/** Panel „Twój problem”. null = jeszcze nieustalone. */
export type ProblemFields = Record<ProblemKey, string | null>

export const PROBLEM_FIELDS: { key: ProblemKey; label: string }[] = [
  { key: 'kogo_dotyczy', label: 'Kogo dotyczy' },
  { key: 'gdzie', label: 'Gdzie (gmina)' },
  { key: 'skala', label: 'Skala' },
  { key: 'przyczyna', label: 'Przyczyna' },
  { key: 'co_probowano', label: 'Co próbowano' },
  { key: 'zasoby', label: 'Zasoby' },
]

export const EMPTY_PROBLEM: ProblemFields = {
  kogo_dotyczy: null,
  gdzie: null,
  skala: null,
  przyczyna: null,
  co_probowano: null,
  zasoby: null,
}

export interface ChatState {
  role: Role | null
  /** true, gdy użytkownik sam zmienił rolę przyciskiem „Zmień” — model jej nie nadpisuje */
  role_locked: boolean
  problem: ProblemFields
  rounds: number
}

export const INITIAL_STATE: ChatState = {
  role: null,
  role_locked: false,
  problem: EMPTY_PROBLEM,
  rounds: 0,
}

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
export const MAX_MESSAGES = 40
export const MAX_MESSAGE_CHARS = 4000

export interface ChatRequest {
  messages: ApiMessage[]
  state: ChatState
  action?: ChatAction
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
  url_zrodlowy: string
  materialy_url: string
  pdf_url: string | null
  youtube_url: string | null
  obraz_url: string
  organizacja: string | null
  licencja: string | null
}

export interface Results {
  no_good_match: boolean
  note: string | null
  items: ResultItem[]
}

/** Zdarzenia SSE z POST /api/v1/chat */
export type ServerEvent =
  | { name: 'text'; data: { text: string } }
  | { name: 'role'; data: { role: Role } }
  | { name: 'problem_update'; data: { problem: ProblemFields } }
  | { name: 'question'; data: Question }
  | { name: 'summary'; data: { summary: string; problem: ProblemFields } }
  | { name: 'results'; data: Results }
  | { name: 'done'; data: { assistant_message: string; state: ChatState } }
  | { name: 'error'; data: { message: string } }
