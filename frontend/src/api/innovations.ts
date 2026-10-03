import type { Innowacja, Kategoria } from '@/types/innowacja'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

/** GET /innovations/{slug}. Zwraca null, gdy pozycji nie ma (404); inne błędy i brak sieci rzucają wyjątek. */
export async function getInnovation(slug: string, signal?: AbortSignal): Promise<Innowacja | null> {
  const res = await fetch(`${BASE_URL}/innovations/${encodeURIComponent(slug)}`, { signal })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as Innowacja
}

export interface InnovationFilter {
  kategoria?: string | null
  q?: string
  wybrane?: boolean
}

/**
 * GET /innovations?kategoria=&q=&wybrane=true (zadanie 0003): lista innowacji po filtrach.
 * Błędy i brak sieci rzucają wyjątek (strona pokazuje komunikat i przycisk ponowienia).
 */
export async function listInnovations(filter: InnovationFilter = {}, signal?: AbortSignal): Promise<Innowacja[]> {
  const params = new URLSearchParams()
  if (filter.kategoria) params.set('kategoria', filter.kategoria)
  if (filter.q?.trim()) params.set('q', filter.q.trim())
  if (filter.wybrane) params.set('wybrane', 'true')
  const query = params.toString()
  const res = await fetch(`${BASE_URL}/innovations${query ? `?${query}` : ''}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as Innowacja[]
}

/** GET /categories: kategorie z liczbą innowacji. */
export async function getCategories(signal?: AbortSignal): Promise<Kategoria[]> {
  const res = await fetch(`${BASE_URL}/categories`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as Kategoria[]
}
