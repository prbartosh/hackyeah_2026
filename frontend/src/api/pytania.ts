// Kontrakt = backend/app/schemas/pytanie.py (ADR 0015). Przy zmianach schematu poprawiaj ten plik.
import { call } from '@/admin/api'

export type StatusPytania = 'nowe' | 'odpowiedziane' | 'opublikowane' | 'ukryte'

export interface PytaniePubliczne {
  id: number
  tresc: string
  kategoria: string | null
  odpowiedz: string
  odpowiedziano: string
  syntetyczne: boolean
}

export interface PytanieAdmin {
  id: number
  tresc: string
  kategoria: string | null
  autor_nazwa: string | null
  autor_email: string | null
  zgoda_na_publikacje: boolean
  odpowiedz: string | null
  odpowiedziano: string | null
  status: StatusPytania
  syntetyczne: boolean
  created_at: string
}

export interface PytanieCreate {
  tresc: string
  kategoria?: string
  autor_nazwa?: string
  autor_email?: string
  zgoda_na_publikacje: boolean
}

const post = (data?: unknown): RequestInit => ({ method: 'POST', body: data ? JSON.stringify(data) : undefined })

export const pytania = {
  list: (q: string, kategoria: string) => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (kategoria) params.set('kategoria', kategoria)
    return call<PytaniePubliczne[]>(`/pytania?${params}`, {}, false)
  },
  create: (data: PytanieCreate) => call<{ id: number; status: StatusPytania }>('/pytania', post(data), false),
  adminList: (status: StatusPytania | '', offset = 0) =>
    call<{ items: PytanieAdmin[]; total: number }>(
      `/admin/pytania?${new URLSearchParams({ ...(status ? { status } : {}), offset: String(offset) })}`,
    ),
  answer: (id: number, odpowiedz: string) => call<PytanieAdmin>(`/admin/pytania/${id}/odpowiedz`, post({ odpowiedz })),
  publish: (id: number) => call<PytanieAdmin>(`/admin/pytania/${id}/publikuj`, post()),
  hide: (id: number) => call<PytanieAdmin>(`/admin/pytania/${id}/ukryj`, post()),
}
