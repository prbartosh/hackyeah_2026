/** „Moje sprawy”: tokeny wątków w localStorage przeglądarki (bez kont, tylko na tym urządzeniu). */
export interface SavedThread {
  token: string
  opis: string
  zapisano: string
}

const KEY = 'splot-moje-sprawy'
const MAX = 20

export function snippet(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 80 ? `${clean.slice(0, 80)}…` : clean
}

export function parseStored(raw: string | null): SavedThread[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data
      .filter((x): x is SavedThread => !!x && typeof x.token === 'string' && x.token.length > 0)
      .map((x) => ({ token: x.token, opis: String(x.opis ?? ''), zapisano: String(x.zapisano ?? '') }))
      .slice(0, MAX)
  } catch {
    return []
  }
}

/** Wpis na początek listy; ten sam token nie powtarza się, a pusty opis nie nadpisuje starego. */
export function upsertThread(list: SavedThread[], token: string, opis: string, now = new Date()): SavedThread[] {
  const old = list.find((t) => t.token === token)
  const entry = { token, opis: opis ? snippet(opis) : (old?.opis ?? ''), zapisano: old?.zapisano ?? now.toISOString() }
  return [entry, ...list.filter((t) => t.token !== token)].slice(0, MAX)
}

export function loadThreads(): SavedThread[] {
  try {
    return parseStored(localStorage.getItem(KEY))
  } catch {
    return []
  }
}

export function saveThread(token: string, opis = ''): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(upsertThread(loadThreads(), token, opis)))
  } catch {
    /* tryb prywatny lub zablokowane dane witryny: lista po prostu się nie zapisze */
  }
}
