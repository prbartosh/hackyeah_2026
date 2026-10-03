// Autor nie ma konta: lista jego szkiców to tylko skrót w tej przeglądarce. Dostęp daje token w adresie.
export interface SavedDraft {
  typ: 'fiszka' | 'wniosek' | 'canva'
  token: string
  tytul: string
  zapisano: string
}

const KEY = 'kreator-szkice'
const MAX = 20

export function getDrafts(): SavedDraft[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function rememberDraft(item: Omit<SavedDraft, 'zapisano'>): void {
  try {
    const rest = getDrafts().filter((d) => !(d.typ === item.typ && d.token === item.token))
    const next = [{ ...item, zapisano: new Date().toISOString() }, ...rest].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* tryb prywatny: skrót się nie zapisze, szkic jest i tak na serwerze */
  }
}

export const DRAFT_LINKS: Record<SavedDraft['typ'], { label: string; path: string }> = {
  fiszka: { label: 'Fiszka pomysłu', path: '/kreator/fiszka' },
  wniosek: { label: 'Wniosek', path: '/kreator/wniosek' },
  canva: { label: 'Canva', path: '/kreator/canva' },
}
