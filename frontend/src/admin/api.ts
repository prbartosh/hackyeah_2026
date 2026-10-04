import type {
  AppNotification, Card, CardInput, CardListItem, Cluster, ImportDetail, ImportListItem, Note, Page,
  PanelSettings, PublicThread, Radar, ThreadMessage, Ticket, TicketListItem,
} from '@/admin/types'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'
const TOKEN_KEY = 'admin-token'

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* tryb prywatny: token zostaje tylko w pamięci kontekstu */
  }
}

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

function friendly(status: number, detail: unknown): string {
  if (typeof detail === 'string' && detail) return detail
  if (Array.isArray(detail)) return 'Sprawdź poprawność wpisanych danych.'
  if (status === 429) return 'Za dużo zapytań w krótkim czasie. Odczekaj minutę i spróbuj ponownie.'
  if (status === 401) return 'Sesja wygasła lub token jest nieprawidłowy. Zaloguj się ponownie.'
  if (status === 503) return 'Panel jest wyłączony na serwerze (brak tokenu administratora).'
  if (status >= 500) return 'Serwer nie mógł wykonać operacji. Spróbuj za chwilę.'
  return 'Nie udało się wykonać operacji.'
}

export async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (auth && token) headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  } catch {
    throw new AdminApiError(0, 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.')
  }
  if (!response.ok) {
    let detail: unknown
    try {
      detail = (await response.json()).detail
    } catch {
      /* odpowiedź bez JSON */
    }
    throw new AdminApiError(response.status, friendly(response.status, detail))
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

/** Stack demo (DEMO_TOUR_ENABLED): token panelu bez logowania. false, gdy wyłączone (404) albo błąd. */
export async function demoLogin(): Promise<boolean> {
  try {
    const { token } = await call<{ token: string }>('/demo/admin-session', { method: 'POST' }, false)
    if (!token) return false
    setToken(token)
    return true
  } catch {
    return false
  }
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const api = {
  createTicket: (data: { tresc: string; autor_nazwa?: string; autor_email?: string; obserwuj?: boolean }) =>
    call<{ token_watku: string }>('/zgloszenia', json('POST', data), false),
  publicThread: (token: string) => call<PublicThread>(`/zgloszenia/watek/${encodeURIComponent(token)}`, {}, false),
  replyInThread: (token: string, tresc: string) =>
    call<ThreadMessage>(`/zgloszenia/watek/${encodeURIComponent(token)}/wiadomosci`, json('POST', { tresc }), false),

  tickets: (p: Record<string, string | number | undefined>) =>
    call<Page<TicketListItem>>(`/admin/zgloszenia${query(p)}`),
  ticket: (id: number) => call<Ticket>(`/admin/zgloszenia/${id}`),
  triage: (id: number) => call<Ticket>(`/admin/zgloszenia/${id}/triaz`, { method: 'POST' }),
  saveDraft: (id: number, szkic_odpowiedzi: string) =>
    call<Ticket>(`/admin/zgloszenia/${id}/szkic`, json('PUT', { szkic_odpowiedzi })),
  approveReply: (id: number, tresc: string, zrodla: string[]) =>
    call<Ticket>(`/admin/zgloszenia/${id}/odpowiedz`, json('POST', { tresc, zrodla })),
  forwardQuestion: (id: number, opinia_id: number, tresc: string) =>
    call<Ticket>(`/admin/zgloszenia/${id}/przekaz`, json('POST', { opinia_id, tresc })),

  notifications: (onlyUnread = false) =>
    call<{ items: AppNotification[]; nieprzeczytane: number }>(
      `/admin/powiadomienia${query({ tylko_nieprzeczytane: onlyUnread ? 'true' : undefined })}`,
    ),
  markRead: (ids: number[] | null) =>
    call<{ oznaczono: number }>('/admin/powiadomienia/przeczytaj', json('POST', { ids })),
  settings: () => call<PanelSettings>('/admin/ustawienia'),
  saveSettings: (data: Partial<PanelSettings>) => call<PanelSettings>('/admin/ustawienia', json('PUT', data)),

  cards: (p: Record<string, string | number | undefined>) =>
    call<Page<CardListItem>>(`/admin/karty${query(p)}`),
  card: (slug: string) => call<Card>(`/admin/karty/${encodeURIComponent(slug)}`),
  createCard: (data: CardInput & { nazwa: string }) => call<Card>('/admin/karty', json('POST', data)),
  updateCard: (slug: string, data: CardInput) =>
    call<Card>(`/admin/karty/${encodeURIComponent(slug)}`, json('PATCH', data)),
  cardPreview: (slug: string) =>
    call<import('@/types/innowacja').Innowacja>(`/admin/karty/${encodeURIComponent(slug)}/podglad`),

  imports: () => call<Page<ImportListItem>>('/admin/importy?limit=50'),
  importDetail: (id: number) => call<ImportDetail>(`/admin/importy/${id}`),
  uploadDocument: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return call<ImportDetail>('/admin/importy', { method: 'POST', body: form })
  },
  editImport: (id: number, pola: Record<string, unknown>) =>
    call<ImportDetail>(`/admin/importy/${id}`, json('PATCH', { pola })),
  approveImport: (id: number, aktualizuj_slug: string | null) =>
    call<ImportDetail>(`/admin/importy/${id}/zatwierdz`, json('POST', { aktualizuj_slug })),
  rejectImport: (id: number) => call<ImportDetail>(`/admin/importy/${id}/odrzuc`, { method: 'POST' }),

  radar: () => call<Radar>('/admin/radar'),
  notes: () => call<Note[]>('/admin/radar/notatki'),
  createNote: (cluster: Cluster) =>
    call<Note>('/admin/radar/notatki', json('POST', { tytul: cluster.nazwa, zgloszenia_ids: cluster.zgloszenia_ids })),
  setNoteDone: (id: number, wykonana: boolean) =>
    call<Note>(`/admin/radar/notatki/${id}`, json('PATCH', { wykonana })),
}
