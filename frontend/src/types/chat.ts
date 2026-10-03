// Kontrakt czatu zgodny z docs/DEMO.md (sekcje „API” i „Narzędzia modelu”)

export type Role = 'mieszkaniec' | 'jst' | 'ngo' | 'ops' | 'ekspert'

export const ROLE_LABELS: Record<Role, string> = {
  mieszkaniec: 'Mieszkaniec lub opiekun',
  jst: 'Samorząd (JST)',
  ngo: 'Organizacja pozarządowa (NGO)',
  ops: 'Pracownik CUS / OPS',
  ekspert: 'Ekspert',
}

export type ProblemField = 'opis' | 'kogo' | 'gdzie' | 'skala' | 'przyczyna' | 'proby' | 'zasoby'

export const PROBLEM_FIELDS: { key: ProblemField; label: string }[] = [
  { key: 'opis', label: 'Problem' },
  { key: 'kogo', label: 'Kogo dotyczy' },
  { key: 'gdzie', label: 'Gdzie (gmina)' },
  { key: 'skala', label: 'Skala' },
  { key: 'przyczyna', label: 'Przyczyna' },
  { key: 'proby', label: 'Co próbowano' },
  { key: 'zasoby', label: 'Zasoby' },
]

export type ProblemState = Partial<Record<ProblemField, string>>

export interface Question {
  id: string
  /** Pole problemu, które uzupełnia odpowiedź */
  field?: ProblemField
  text: string
  options: string[]
}

export interface ResultItem {
  slug: string
  nazwa: string
  kategoria: string | null
  organizacja: string | null
  url_zrodlowy: string
  wybrana_do_upowszechniania: boolean
  /** Uzasadnienie oparte wyłącznie na danych z karty pozycji */
  why_relevant: string
  /** Wypełnione, gdy brak dobrego dopasowania: czym pozycja różni się od potrzeby */
  difference?: string
}

export type ChatEvent =
  | { type: 'text'; delta: string }
  | { type: 'role'; role: Role }
  | { type: 'question'; question: Question }
  | { type: 'problem_update'; fields: ProblemState }
  | { type: 'summary'; text: string }
  | { type: 'results'; items: ResultItem[]; no_match: boolean }
  | { type: 'demo_mode' }
  | { type: 'error'; message: string }

export type ChatAction = 'message' | 'answer' | 'confirm_summary' | 'show_results_now' | 'change_role'

export interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  problem: ProblemState
  role: Role | null
  action: ChatAction
  /** Liczba zadanych dotąd pytań doprecyzowujących (limit 3–4 rund) */
  rounds: number
  /** Id pytania, na które odpowiada wiadomość (action = 'answer') */
  question_id?: string
  /** Podsumowanie zatwierdzone lub poprawione przez użytkownika */
  summary?: string
}
