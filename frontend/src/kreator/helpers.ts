import type { Etap } from '@/kreator/types'

export const ETAPY: { value: Etap; label: string; opis: string }[] = [
  { value: 'pomysl', label: 'Pomysł', opis: 'Mamy koncepcję, ale jeszcze nie sprawdziliśmy jej z odbiorcami.' },
  { value: 'test_mikroskala', label: 'Test w mikroskali', opis: 'Wypróbowaliśmy rozwiązanie na małej grupie lub krótko.' },
  { value: 'wdrozone_lokalnie', label: 'Wdrożone lokalnie', opis: 'Rozwiązanie już działa w naszej gminie, szkole lub organizacji.' },
]

export function etapLabel(etap: string | null): string {
  return ETAPY.find((e) => e.value === etap)?.label ?? '—'
}

/** Licznik znaków: „120 z 400 znaków (zostało 280)”. */
export function counterText(length: number, limit: number): string {
  const left = limit - length
  return left >= 0
    ? `${length} z ${limit} znaków (zostało ${left})`
    : `${length} z ${limit} znaków (o ${-left} za dużo)`
}

/** Komunikat dla czytnika ekranu tylko, gdy limit jest bliski: bez zalewania go przy każdym znaku. */
export function limitAnnouncement(length: number, limit: number): string {
  const left = limit - length
  if (left <= 0) return 'Osiągnięto limit znaków w tym polu.'
  if (left <= Math.max(10, Math.floor(limit * 0.1))) return `Zostało ${left} znaków.`
  return ''
}

export function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Klucz pola wniosku z jego nazwy, np. „Opis projektu” → „opis_projektu”. */
export function keyFromLabel(label: string): string {
  const plain = label.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/\p{M}/gu, '')
  return plain.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'pole'
}
