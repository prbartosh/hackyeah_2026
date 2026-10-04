import { getToken } from '@/admin/api'
import type { TourContext } from '@/tour/types'
import { readJson, removeKey, writeJson } from '@/tour/engine/storage'

export const CTX_KEY = 'tour-ctx'

export interface ContextOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
  tokenProvider?: () => string | null
}

export interface TourContextHandle extends TourContext {
  clear(): void
}

/** Wspólny stan przewodnika w sessionStorage (z pamięcią jako zapasem) i zapytania do API. */
export function createTourContext(opts: ContextOptions = {}): TourContextHandle {
  const base = (opts.baseUrl ?? import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '')
  const memory: Record<string, string> = readJson<Record<string, string>>('session', CTX_KEY) ?? {}
  const token = opts.tokenProvider ?? getToken

  return {
    get: (key) => memory[key],
    set(key, value) {
      memory[key] = value
      writeJson('session', CTX_KEY, memory)
    },
    clear() {
      for (const k of Object.keys(memory)) delete memory[k]
      removeKey('session', CTX_KEY)
    },
    async api<T = unknown>(path: string, init: RequestInit & { admin?: boolean } = {}): Promise<T> {
      const { admin, ...rest } = init
      const headers = new Headers(rest.headers)
      if (rest.body && !headers.has('Content-Type') && typeof rest.body === 'string') headers.set('Content-Type', 'application/json')
      if (admin) {
        const t = token()
        if (!t) throw new Error('Ten krok wymaga zalogowania w panelu.')
        headers.set('Authorization', `Bearer ${t}`)
      }
      const response = await (opts.fetchImpl ?? fetch)(`${base}${path.startsWith('/') ? path : `/${path}`}`, { ...rest, headers })
      if (!response.ok) {
        let detail = ''
        try {
          const data = await response.json()
          detail = typeof data?.detail === 'string' ? data.detail : ''
        } catch {
          /* odpowiedź bez JSON */
        }
        throw new Error(`Zapytanie ${path} nie powiodło się (${response.status})${detail ? `: ${detail}` : ''}`)
      }
      if (response.status === 204) return undefined as T
      return (await response.json()) as T
    },
  }
}
