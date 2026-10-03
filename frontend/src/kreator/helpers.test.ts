import { describe, expect, it } from 'vitest'
import { counterText, formatDay, keyFromLabel, limitAnnouncement } from '@/kreator/helpers'

describe('counterText', () => {
  it('pokazuje, ile znaków zostało', () => {
    expect(counterText(120, 400)).toBe('120 z 400 znaków (zostało 280)')
  })
  it('pokazuje przekroczenie limitu słowami, nie tylko kolorem', () => {
    expect(counterText(405, 400)).toBe('405 z 400 znaków (o 5 za dużo)')
  })
})

describe('limitAnnouncement', () => {
  it('milczy, gdy do limitu jest daleko', () => {
    expect(limitAnnouncement(10, 400)).toBe('')
  })
  it('ostrzega blisko limitu i na limicie', () => {
    expect(limitAnnouncement(370, 400)).toBe('Zostało 30 znaków.')
    expect(limitAnnouncement(400, 400)).toBe('Osiągnięto limit znaków w tym polu.')
  })
})

describe('keyFromLabel', () => {
  it('zamienia nazwę pola na klucz bez polskich znaków', () => {
    expect(keyFromLabel('Opis projektu')).toBe('opis_projektu')
    expect(keyFromLabel('Grupa docelowa, łączna')).toBe('grupa_docelowa_laczna')
  })
})

describe('formatDay', () => {
  it('formatuje datę po polsku', () => {
    expect(formatDay('2026-10-03')).toContain('2026')
  })
})
