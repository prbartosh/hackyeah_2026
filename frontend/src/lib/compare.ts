// Logika porównania innowacji: lista wybranych pozycji (maks. 3) i parsowanie adresu /porownaj?slug=a&slug=b

export const MAX_COMPARE = 3
export const MIN_COMPARE = 2

export interface CompareItem {
  slug: string
  nazwa: string
}

const SLUG_RE = /^[a-z0-9-]{1,120}$/i

export function addItem(items: CompareItem[], item: CompareItem): CompareItem[] {
  if (items.some((i) => i.slug === item.slug) || items.length >= MAX_COMPARE) return items
  return [...items, item]
}

export function removeItem(items: CompareItem[], slug: string): CompareItem[] {
  return items.filter((i) => i.slug !== slug)
}

export function toggleItem(items: CompareItem[], item: CompareItem): CompareItem[] {
  return items.some((i) => i.slug === item.slug) ? removeItem(items, item.slug) : addItem(items, item)
}

/** Slugi z parametrów adresu: bez duplikatów i niepoprawnych wartości, maks. 3 pierwsze. */
export function parseSlugs(params: URLSearchParams): string[] {
  const out: string[] = []
  for (const raw of params.getAll('slug')) {
    const slug = raw.trim()
    if (SLUG_RE.test(slug) && !out.includes(slug)) out.push(slug)
  }
  return out.slice(0, MAX_COMPARE)
}

export function compareUrl(slugs: string[]): string {
  const params = new URLSearchParams()
  slugs.slice(0, MAX_COMPARE).forEach((s) => params.append('slug', s))
  return `/porownaj?${params.toString()}`
}

/** Odczyt z sessionStorage (JSON): odporny na śmieci, wpisy przechodzą przez te same reguły co dodawanie. */
export function parseStored(raw: string | null): CompareItem[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    let items: CompareItem[] = []
    for (const d of data) {
      if (d && typeof d === 'object' && typeof (d as CompareItem).slug === 'string' && typeof (d as CompareItem).nazwa === 'string') {
        const { slug, nazwa } = d as CompareItem
        if (SLUG_RE.test(slug)) items = addItem(items, { slug, nazwa })
      }
    }
    return items
  } catch {
    return []
  }
}
