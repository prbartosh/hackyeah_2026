// Kontrakt = backend/app/schemas/opinion.py. Przy zmianach schematu poprawiaj ten plik.
import { call } from '@/admin/api'

export type RodzajOpinii = 'test' | 'ocena'
export type StatusOpinii = 'nowa' | 'opublikowana' | 'ukryta'
export type PoziomDowodu = 'opisane' | 'pilotaz' | 'sprawdzone'

export interface OpiniaPublic {
  rodzaj: RodzajOpinii
  ocena: number | null
  instytucja: string | null
  tresc: string
  usprawnienie: string | null
  syntetyczna: boolean
  created_at: string
}

export interface OpinieSummary {
  slug: string
  liczba_ocen: number
  srednia: number | null
  liczba_testow: number
  poziom: { kod: PoziomDowodu; etykieta: string; opis: string }
  opinie: OpiniaPublic[]
  /** Jest instytucja testująca, do której ROPS może przekazać pytanie. */
  mozna_zapytac: boolean
}

export interface PytanieCreate {
  tresc: string
  instytucja?: string
  autor_email?: string
}

export interface OpiniaCreate {
  rodzaj: RodzajOpinii
  ocena?: number
  instytucja?: string
  tresc: string
  usprawnienie?: string
  autor_email?: string
}

export interface OpiniaAdmin extends OpiniaPublic {
  id: number
  slug: string
  nazwa: string | null
  status: StatusOpinii
  token_watku: string | null
}

/** Kolejność kroków poziomu dowodu, do wizualizacji „gdzie jesteśmy”. */
export const POZIOMY: { kod: PoziomDowodu; etykieta: string }[] = [
  { kod: 'opisane', etykieta: 'Opisane' },
  { kod: 'pilotaz', etykieta: 'W testach' },
  { kod: 'sprawdzone', etykieta: 'Sprawdzone' },
]

export const OCENY: Record<number, string> = {
  1: 'Nie działa',
  2: 'Słabo',
  3: 'Średnio',
  4: 'Dobrze',
  5: 'Bardzo dobrze',
}

const path = (slug: string) => `/innovations/${encodeURIComponent(slug)}/opinie`

export const opinions = {
  summary: (slug: string) => call<OpinieSummary>(path(slug), {}, false),
  create: (slug: string, data: OpiniaCreate) =>
    call<{ status: StatusOpinii; token_watku: string | null }>(
      path(slug), { method: 'POST', body: JSON.stringify(data) }, false,
    ),
  ask: (slug: string, data: PytanieCreate) =>
    call<{ token_watku: string }>(`${path(slug)}/pytanie`, { method: 'POST', body: JSON.stringify(data) }, false),
  adminList: (status: StatusOpinii | '', offset = 0) =>
    call<{ items: OpiniaAdmin[]; total: number }>(
      `/admin/opinie?${new URLSearchParams({ ...(status ? { status } : {}), offset: String(offset) })}`,
    ),
  setStatus: (id: number, status: StatusOpinii) =>
    call<OpiniaAdmin>(`/admin/opinie/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}
