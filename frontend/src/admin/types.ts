// Kontrakt z backendem: backend/app/schemas/{ticket,admin_card,admin_import,radar}.py

export type StatusZgloszenia = 'nowe' | 'w_trakcie' | 'odpowiedziane'
export type Pilnosc = 'niska' | 'srednia' | 'wysoka'
export type StatusKarty = 'szkic' | 'opublikowana' | 'zarchiwizowana'
export type PoziomDowodu = 'brak_danych' | 'zadeklarowany' | 'pilotaz' | 'przetestowany' | 'wdrozony'
export type PoziomKosztu = 'niski' | 'sredni' | 'wysoki'
export type CzasStartu = 'dni' | 'tygodnie' | 'miesiace'

export interface Sla {
  oczekuje_godzin: number
  cel_godzin: number
  przeterminowane: boolean
  pozostalo_godzin: number | null
}

export interface TicketListItem {
  id: number
  skrot: string
  status: StatusZgloszenia
  kategoria: string | null
  pilnosc: Pilnosc | null
  created_at: string
  syntetyczne: boolean
  triaz_wykonany: boolean
  liczba_duplikatow: number
  sla: Sla
}

export interface ThreadMessage {
  autor_rola: 'uzytkownik' | 'admin' | 'mentor' | 'system'
  tresc: string
  zrodla: { slug: string; nazwa: string; url: string }[] | null
  created_at: string
}

export interface CardSuggestion {
  slug: string
  nazwa: string
  score: number
  powody: string[]
  url: string
  uzyta: boolean
}

export interface Duplicate {
  id: number
  score: number
  tresc: string
  status: StatusZgloszenia
}

export interface Ticket extends TicketListItem {
  tresc: string
  autor_nazwa: string | null
  autor_email: string | null
  pilnosc_uzasadnienie: string | null
  duplikaty: Duplicate[]
  proponowane_karty: CardSuggestion[]
  szkic_odpowiedzi: string | null
  triaz_zrodlo: 'ai' | 'reguly' | null
  triaz_komunikat: string | null
  najlepsze_dopasowanie: number | null
  wiadomosci: ThreadMessage[]
  innowacja_slug: string | null
  testujacy: TesterContact[]
}

/** Instytucja testująca innowację z pytania; kontakt tylko przez wątek ROPS. */
export interface TesterContact {
  opinia_id: number
  instytucja: string | null
  tresc: string
}

export interface Page<T> {
  items: T[]
  total: number
}

export interface AppNotification {
  id: number
  tekst: string
  zgloszenie_id: number | null
  przeczytane: boolean
  created_at: string
}

export interface PanelSettings {
  prog_duplikatow: number
  prog_dopasowania: number
  prog_klastra: number
  sla_godziny: number
  ai_dostepne: boolean
}

export interface Wdrozenie {
  poziom_kosztu: PoziomKosztu | null
  czas_startu: CzasStartu | null
  wymagane_zasoby: string[]
  uwagi: string | null
}

export interface CardListItem {
  slug: string
  nazwa: string
  status: StatusKarty
  zrodlo: string
  kategorie: string[]
  poziom_dowodu: PoziomDowodu | null
  updated_at: string
}

export interface Card extends CardListItem {
  wybrana_do_upowszechniania: boolean
  opis: string | null
  problem: string | null
  grupa_docelowa: string | null
  kto_moze_skorzystac: string | null
  czy_dziala: string | null
  organizacja: string | null
  licencja: string | null
  url_zrodlowy: string | null
  wdrozenie: Wdrozenie | null
  ostrzezenie: string | null
}

export type CardInput = Partial<Omit<Card, 'slug' | 'zrodlo' | 'updated_at' | 'ostrzezenie' | 'url_zrodlowy'>>

export interface ImportListItem {
  id: number
  nazwa_pliku: string
  status: 'szkic' | 'zatwierdzony' | 'odrzucony'
  ekstrakcja_zrodlo: 'ai' | 'reczna'
  karta_slug: string | null
  created_at: string
}

export interface ImportField {
  wartosc: string | string[] | null
  cytat: string | null
  pewnosc: number | null
  niska_pewnosc: boolean
  reczne: boolean
}

export interface ImportDetail extends ImportListItem {
  komunikat: string | null
  tekst: string
  pola: Record<string, ImportField>
  etykiety: Record<string, string>
}

export interface Cluster {
  klucz: string
  nazwa: string
  nazwa_zrodlo: 'ai' | 'slowa' | 'slownik'
  powod: string
  liczba: number
  kategoria: string | null
  trend: { tydzien: string; liczba: number }[]
  zmiana: string
  przyklady: { id: number; skrot: string }[]
  zgloszenia_ids: number[]
  notatka_id: number | null
}

export interface Radar {
  klastry: Cluster[]
  bez_dopasowania: number
  nieprzeanalizowane: number
  prog_dopasowania: number
  prog_klastra: number
  komunikat: string | null
}

export interface Note {
  id: number
  tytul: string
  tresc: string
  zgloszenia_ids: number[]
  wykonana: boolean
  created_at: string
}

export interface PublicThread {
  status: StatusZgloszenia
  wiadomosci: ThreadMessage[]
}
