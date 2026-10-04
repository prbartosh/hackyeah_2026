// Kontrakt = backend/app/schemas/partnership.py (ADR 0013). Przy zmianach schematu poprawiaj ten plik.
import { call } from '@/admin/api'

export type TypOgloszenia = 'szukam_partnera' | 'oferuje_wsparcie'
export type Sektor = 'publiczny' | 'ngo' | 'biznes' | 'nauka' | 'mieszkancy'
export type StatusOgloszenia = 'oczekuje' | 'opublikowane' | 'odrzucone'

export const TYPY: Record<TypOgloszenia, string> = {
  szukam_partnera: 'Szukam partnera',
  oferuje_wsparcie: 'Oferuję wsparcie',
}

export const SEKTORY: Record<Sektor, string> = {
  publiczny: 'Sektor publiczny',
  ngo: 'Organizacje pozarządowe',
  biznes: 'Biznes',
  nauka: 'Nauka',
  mieszkancy: 'Mieszkańcy',
}

export const POWIATY = [
  'bocheński', 'brzeski', 'chrzanowski', 'dąbrowski', 'gorlicki', 'krakowski', 'limanowski',
  'miechowski', 'myślenicki', 'nowosądecki', 'nowotarski', 'olkuski', 'oświęcimski',
  'proszowicki', 'suski', 'tarnowski', 'tatrzański', 'wadowicki', 'wielicki',
  'm. Kraków', 'm. Nowy Sącz', 'm. Tarnów',
]

export interface Oferta {
  id: number
  typ: TypOgloszenia
  sektor: Sektor
  instytucja: string
  tytul: string
  opis: string
  powiat: string
  innowacja_slug: string | null
  syntetyczne: boolean
  created_at: string
}

export interface OfertaAdmin extends Oferta {
  status: StatusOgloszenia
  kontakt_email: string
}

export interface OfertaCreate {
  typ: TypOgloszenia
  sektor: Sektor
  instytucja: string
  tytul: string
  opis: string
  powiat: string
  innowacja_slug?: string
  kontakt_email: string
}

export interface Kontakt {
  nadawca_nazwa: string
  nadawca_email: string
  tresc: string
}

export interface Filtry {
  typ?: string
  sektor?: string
  powiat?: string
  innowacja?: string
}

const json = (data: unknown) => ({ method: 'POST', body: JSON.stringify(data) })

export const partnerships = {
  list: (filters: Filtry) => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][])
    return call<Oferta[]>(`/partnerstwa?${params}`, {}, false)
  },
  create: (data: OfertaCreate) => call<{ id: number; status: StatusOgloszenia }>('/partnerstwa', json(data), false),
  contact: (id: number, data: Kontakt) => call<{ status: string }>(`/partnerstwa/${id}/kontakt`, json(data), false),
  adminList: (status: StatusOgloszenia | '', offset = 0) =>
    call<{ items: OfertaAdmin[]; total: number }>(
      `/admin/partnerstwa?${new URLSearchParams({ ...(status ? { status } : {}), offset: String(offset) })}`,
    ),
  setStatus: (id: number, status: 'opublikowane' | 'odrzucone') =>
    call<OfertaAdmin>(`/admin/partnerstwa/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}
