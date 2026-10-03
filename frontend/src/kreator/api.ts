import { AdminApiError, call } from '@/admin/api'
import type {
  AiFill, Asystent, Canva, Fiszka, FiszkaFields, Nabor, NaborInput, Nabory, PodobnaInnowacja, Wniosek,
} from '@/kreator/types'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const enc = encodeURIComponent

export const kreator = {
  createFiszka: (data: Partial<FiszkaFields>) => call<Fiszka>('/kreator/fiszki', json('POST', data), false),
  fiszkaZKarty: (slug: string) => call<Fiszka>(`/kreator/fiszki/z-karty/${enc(slug)}`, { method: 'POST' }, false),
  fiszka: (token: string) => call<Fiszka>(`/kreator/fiszki/${enc(token)}`, {}, false),
  saveFiszka: (token: string, data: Partial<FiszkaFields>) =>
    call<Fiszka>(`/kreator/fiszki/${enc(token)}`, json('PUT', data), false),
  podobne: (token: string) =>
    call<{ items: PodobnaInnowacja[] }>(`/kreator/fiszki/${enc(token)}/podobne`, {}, false),
  sendFiszka: (token: string, data: { autor_nazwa?: string; autor_email?: string }) =>
    call<{ token_watku: string }>(`/kreator/fiszki/${enc(token)}/wyslij`, json('POST', data), false),
  asystent: (token: string) => call<Asystent>(`/kreator/fiszki/${enc(token)}/asystent`, { method: 'POST' }, false),
  aiWypelnij: (opis: string) => call<AiFill>('/kreator/ai/wypelnij', json('POST', { opis }), false),

  nabory: (p: { fiszka?: string; karta?: string }) => {
    const search = new URLSearchParams()
    if (p.fiszka) search.set('fiszka', p.fiszka)
    if (p.karta) search.set('karta', p.karta)
    const q = search.toString()
    return call<Nabory>(`/kreator/nabory${q ? `?${q}` : ''}`, {}, false)
  },
  createWniosek: (fiszka_token: string, nabor_slug: string) =>
    call<Wniosek>('/kreator/wnioski', json('POST', { fiszka_token, nabor_slug }), false),
  wniosek: (token: string) => call<Wniosek>(`/kreator/wnioski/${enc(token)}`, {}, false),
  saveWniosek: (token: string, pola: Record<string, string>) =>
    call<Wniosek>(`/kreator/wnioski/${enc(token)}`, json('PUT', { pola }), false),
  sendWniosek: (token: string) =>
    call<{ token_watku: string }>(`/kreator/wnioski/${enc(token)}/wyslij`, { method: 'POST' }, false),

  szablonyCanvy: () => call<Canva['szablon'][]>('/kreator/canvy/szablony', {}, false),
  createCanva: (data: { szablon?: string; tytul?: string; fiszka_token?: string }) =>
    call<Canva>('/kreator/canvy', json('POST', data), false),
  canva: (token: string) => call<Canva>(`/kreator/canvy/${enc(token)}`, {}, false),
  saveCanva: (token: string, data: { tytul?: string; wartosci?: Record<string, string> }) =>
    call<Canva>(`/kreator/canvy/${enc(token)}`, json('PUT', data), false),

  adminNabory: () => call<{ items: Nabor[]; total: number }>('/admin/nabory?limit=100'),
  adminNabor: (slug: string) => call<Nabor>(`/admin/nabory/${enc(slug)}`),
  createNabor: (data: NaborInput) => call<Nabor>('/admin/nabory', json('POST', data)),
  updateNabor: (slug: string, data: NaborInput) => call<Nabor>(`/admin/nabory/${enc(slug)}`, json('PUT', data)),
}

/** Pobranie pliku (DOCX/TXT) z publicznego endpointu eksportu. */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`)
  } catch {
    throw new AdminApiError(0, 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.')
  }
  if (!response.ok) throw new AdminApiError(response.status, 'Nie udało się przygotować pliku. Spróbuj ponownie.')
  const match = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = match?.[1] ?? fallbackName
  link.click()
  URL.revokeObjectURL(url)
}

export const exportUrl = {
  wniosek: (token: string, format: 'docx' | 'txt') => `/kreator/wnioski/${enc(token)}/eksport?format=${format}`,
  canva: (token: string) => `/kreator/canvy/${enc(token)}/eksport`,
}
