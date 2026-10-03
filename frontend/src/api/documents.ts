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
