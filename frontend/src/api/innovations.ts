import type { Innowacja } from '@/types/innowacja'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

/** GET /innovations/{slug}. Zwraca null, gdy pozycji nie ma (404); inne błędy i brak sieci rzucają wyjątek. */
export async function getInnovation(slug: string, signal?: AbortSignal): Promise<Innowacja | null> {
  const res = await fetch(`${BASE_URL}/innovations/${encodeURIComponent(slug)}`, { signal })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as Innowacja
}
