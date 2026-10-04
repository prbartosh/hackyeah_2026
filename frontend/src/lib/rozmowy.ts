/** Rozmowy partnerskie zapisane w przeglądarce (klucz ustala zadanie 0042). */
export const ROZMOWY_KEY = 'splot-rozmowy'

export interface Rozmowa {
  token: string
  tytul: string
  data: string
}

export function parseRozmowy(raw: string | null): Rozmowa[] {
  if (!raw) return []
  try {
    const v: unknown = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return v.filter(
      (x): x is Rozmowa =>
        !!x && typeof x.token === 'string' && x.token !== '' && typeof x.tytul === 'string' && typeof x.data === 'string',
    )
  } catch {
    return []
  }
}

export function readRozmowy(): Rozmowa[] {
  try {
    return parseRozmowy(window.localStorage.getItem(ROZMOWY_KEY))
  } catch {
    return []
  }
}
