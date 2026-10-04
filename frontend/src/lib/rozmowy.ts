// Rozmowy partnerskie zapamiętane w tej przeglądarce (zadanie 0042). Token = dostęp do rozmowy.
const KEY = 'splot-rozmowy'

export interface ZapamietanaRozmowa {
  token: string
  tytul: string
  data: string
}

export function readRozmowy(): ZapamietanaRozmowa[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is ZapamietanaRozmowa =>
        !!r && typeof r.token === 'string' && typeof r.tytul === 'string' && typeof r.data === 'string',
    )
  } catch {
    return []
  }
}

export function saveRozmowa(entry: ZapamietanaRozmowa): void {
  try {
    const rest = readRozmowy().filter((r) => r.token !== entry.token)
    localStorage.setItem(KEY, JSON.stringify([entry, ...rest].slice(0, 50)))
  } catch {
    /* przeglądarka bez localStorage: link i tak jest w odpowiedzi */
  }
}

export const rozmowaPath = (token: string) => `/rozmowa/${encodeURIComponent(token)}`
