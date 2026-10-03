import { PROBLEM_FIELDS, type ProblemState } from '@/types/chat'

/** Opis problemu z panelu „Twój problem” jako gotowa treść zgłoszenia do ROPS. */
export function problemAsText(state: ProblemState): string {
  return PROBLEM_FIELDS.filter(({ key }) => state[key].tekst?.trim())
    .map(({ key, label }) => `${label}: ${state[key].tekst?.trim()}`)
    .join('\n')
}
