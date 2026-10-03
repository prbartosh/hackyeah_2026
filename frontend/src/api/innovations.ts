import type { Innowacja } from '@/types/innowacja'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

/** Szczegóły pozycji z backendu; do czasu gotowego endpointu — z lokalnej kopii bazy. */
export async function getInnovation(slug: string): Promise<Innowacja | null> {
  try {
    const res = await fetch(`${BASE_URL}/innovations/${encodeURIComponent(slug)}`)
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      return (await res.json()) as Innowacja
    }
    if (res.status === 404 && res.headers.get('content-type')?.includes('application/json')) return null
  } catch {
    /* backend niedostępny — korzystamy z lokalnej bazy */
  }
  const { default: data } = await import('virtual:innowacje')
  return data.find((r) => r.slug === slug) ?? null
}
