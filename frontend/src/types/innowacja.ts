// Rekord z assets/innowacje-spoleczne/innowacje.json (opis pól: docs/baza-innowacji.md)
export interface Innowacja {
  slug: string
  url_zrodlowy: string
  nazwa: string
  kategorie: string[]
  wybrana_do_upowszechniania: boolean
  opis: string | null
  problem: string
  grupa_docelowa: string | null
  kto_moze_skorzystac: string
  czy_dziala: string | null
  organizacja: string | null
  pdf_url: string | null
  youtube_url: string | null
  materialy_url: string
  obraz_url: string
  licencja: string | null
  pobrano_dnia: string
}

export const KATEGORIE: Record<string, string> = {
  'dla-cudzoziemcow': 'Dla cudzoziemców',
  'dla-dzieci-mlodziezy-i-rodziny': 'Dla dzieci, młodzieży i rodziny',
  'dla-osob-o-ograniczonej-mobilnosci': 'Dla osób o ograniczonej mobilności',
  'dla-osob-w-kryzysie-bezdomnosci': 'Dla osób w kryzysie bezdomności',
  'dla-osob-z-niepelnosprawnoscia-intelektualna': 'Dla osób z niepełnosprawnością intelektualną',
  'dla-osob-z-niepelnosprawnoscia-sensoryczna': 'Dla osób z niepełnosprawnością sensoryczną',
  'dla-rynku-pracy': 'Dla rynku pracy',
  'dla-seniorow': 'Dla seniorów',
  'dla-zdrowia-i-medycyny': 'Dla zdrowia i medycyny',
}

export function kategoriaNazwa(slugs: string[]): string | null {
  return slugs.length ? (KATEGORIE[slugs[0]] ?? slugs[0]) : null
}
