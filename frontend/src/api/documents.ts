// Kontrakt = backend/app/schemas/document.py (zadanie 0003). Przy zmianach schematu poprawiaj ten plik.
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export type DocumentType = 'raport' | 'publikacja' | 'mapa-wyzwan' | 'wskaznik'

export interface Dokument {
  id: string
  typ: DocumentType
  tytul: string
  opis: string | null
  rok: number | null
  url_zrodlowy: string
  licencja: string | null
  strony: number | null
  rozmiar: string | null
  kategoria: string | null
  zrodlo_danych: string | null
}

export interface DokumentSzczegoly extends Dokument {
  tresc: string | null
}

export const TYP_NAZWA: Record<DocumentType, string> = {
  raport: 'Raport',
  publikacja: 'Publikacja',
  'mapa-wyzwan': 'Mapa Wyzwań Społecznych',
  wskaznik: 'Wskaźnik Obserwatora',
}

export interface DocumentFilter {
  typ?: DocumentType
  rok?: number | null
  q?: string
}

/** Błędy i brak sieci rzucają wyjątek (strona pokazuje komunikat i przycisk ponowienia). */
export async function listDocuments(filter: DocumentFilter = {}, signal?: AbortSignal): Promise<Dokument[]> {
  const params = new URLSearchParams()
  if (filter.typ) params.set('typ', filter.typ)
  if (filter.rok) params.set('rok', String(filter.rok))
  if (filter.q?.trim()) params.set('q', filter.q.trim())
  const query = params.toString()
  const res = await fetch(`${BASE_URL}/documents${query ? `?${query}` : ''}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as Dokument[]
}

export interface TrafienieDokumentu {
  dokument: Dokument
  /** Zwykły tekst z treści; null, gdy słowa są tylko w tytule lub opisie. */
  fragment: string | null
  /** [początek, koniec) w `fragment`. */
  trafienia: [number, number][]
  strona: number | null
}

/** Minimalna długość zapytania przyjmowana przez backend. */
export const MIN_SZUKANIE = 2

/** Szuka w tytule, opisie i treści dokumentów (backend: `GET /documents/search`). */
export async function searchDocuments(q: string, signal?: AbortSignal): Promise<TrafienieDokumentu[]> {
  const params = new URLSearchParams({ q: q.trim().slice(0, 200), limit: '50' })
  const res = await fetch(`${BASE_URL}/documents/search?${params}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as TrafienieDokumentu[]
}

/** Dzieli fragment na części; `trafienie` = true dla podświetlanych. */
export function podswietl(fragment: string, trafienia: [number, number][]): { tekst: string; trafienie: boolean }[] {
  const czesci: { tekst: string; trafienie: boolean }[] = []
  let poz = 0
  for (const [s, e] of trafienia) {
    if (s < poz || e > fragment.length) continue
    if (s > poz) czesci.push({ tekst: fragment.slice(poz, s), trafienie: false })
    czesci.push({ tekst: fragment.slice(s, e), trafienie: true })
    poz = e
  }
  if (poz < fragment.length) czesci.push({ tekst: fragment.slice(poz), trafienie: false })
  return czesci
}

/** Zwraca null, gdy dokumentu nie ma (404). */
export async function getDocument(id: string, signal?: AbortSignal): Promise<DokumentSzczegoly | null> {
  const res = await fetch(`${BASE_URL}/documents/${encodeURIComponent(id)}`, { signal })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as DokumentSzczegoly
}

/** Treść z PDF dzielona na strony po znacznikach `<!-- page N -->`. Tekst przed pierwszym znacznikiem to strona 0. */
export function splitPages(tresc: string): { strona: number; tekst: string }[] {
  const parts = tresc.split(/<!--\s*page\s+(\d+)\s*-->/)
  const pages: { strona: number; tekst: string }[] = []
  if (parts[0].trim()) pages.push({ strona: 0, tekst: parts[0].trim() })
  for (let i = 1; i < parts.length; i += 2) {
    const tekst = (parts[i + 1] ?? '').trim()
    if (tekst) pages.push({ strona: Number(parts[i]), tekst })
  }
  return pages
}
