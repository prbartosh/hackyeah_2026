// Kontrakt z backendem: backend/app/schemas/kreator.py

export type Etap = 'pomysl' | 'test_mikroskala' | 'wdrozone_lokalnie'
export type PoleFiszki = 'istota' | 'odbiorca' | 'etap' | 'obszar' | 'lokalizacja' | 'potrzeby'

export interface FiszkaFields {
  opis_wlasny: string | null
  istota: string | null
  odbiorca: string | null
  etap: Etap | null
  obszar: string | null
  lokalizacja: string | null
  potrzeby: string | null
  pola_ai: PoleFiszki[]
}

export interface Fiszka extends FiszkaFields {
  token: string
  status: 'szkic' | 'wyslana'
  karta: { slug: string; nazwa: string; url: string } | null
  token_watku: string | null
  syntetyczna: boolean
  updated_at: string
}

export interface AiFill {
  pola: Partial<Record<PoleFiszki, string | null>>
  ai_uzyte: boolean
  komunikat: string | null
}

export interface PodobnaInnowacja {
  slug: string
  nazwa: string
  url: string
  zrodlo: string
  problem: string | null
  grupa_docelowa: string | null
  score: number
}

export interface NaborPole {
  klucz: string
  etykieta: string
  limit: number
  wskazowka: string
  zrodla: PoleFiszki[]
}

export interface Kryterium {
  nazwa: string
  opis: string
}

export interface NaborInput {
  nazwa: string
  organizator: string | null
  opis: string | null
  url_zrodlowy: string | null
  termin_od: string
  termin_do: string
  pola: NaborPole[]
  kryteria: Kryterium[]
  obszary: string[]
  odbiorcy: string[]
}

export interface Nabor extends NaborInput {
  slug: string
  status: 'aktywny' | 'zaplanowany' | 'zakonczony'
  syntetyczny: boolean
}

export interface NaborDopasowany {
  nabor: Nabor
  dopasowanie: { pasuje: boolean; powod: string }
}

export interface Nabory {
  aktywne: NaborDopasowany[]
  kolejny: Nabor | null
  ostatni_zakonczony: Nabor | null
}

export interface WniosekPole {
  klucz: string
  etykieta: string
  limit: number
  wskazowka: string
  tekst: string
  zrodlo: 'ai' | 'fiszka' | 'brak' | 'uzytkownik'
  uzyte_pola: string[]
  do_uzupelnienia: boolean
}

export interface Wniosek {
  token: string
  fiszka_token: string
  nabor: Nabor
  nabor_aktywny: boolean
  pola: WniosekPole[]
  kryteria: Kryterium[]
  status: 'szkic' | 'wyslany'
  token_watku: string | null
  komunikat_ai: string | null
  updated_at: string
}

export interface CanvaSekcja {
  klucz: string
  grupa: string
  tytul: string
  podpowiedz: string
  pytania: string[]
}

export interface Canva {
  token: string
  tytul: string
  szablon: { slug: string; nazwa: string; opis: string | null; url_zrodlowy: string | null; sekcje: CanvaSekcja[] }
  wartosci: Record<string, string>
  fiszka_token: string | null
  syntetyczna: boolean
  updated_at: string
}

export interface Asystent {
  braki: string[]
  pytania: string[]
  kolejne_kroki: string[]
  ai_uzyte: boolean
  komunikat: string | null
}
