import { describe, expect, it } from 'vitest'
import { parseRozmowy } from './rozmowy'

describe('parseRozmowy', () => {
  it('zwraca pustą listę dla braku lub błędnych danych', () => {
    expect(parseRozmowy(null)).toEqual([])
    expect(parseRozmowy('{nie json')).toEqual([])
    expect(parseRozmowy('{"a":1}')).toEqual([])
  })

  it('pomija wpisy bez tokenu lub tytułu', () => {
    const raw = JSON.stringify([
      { token: 'abc', tytul: 'Pomoc sąsiedzka', data: '2026-10-04' },
      { token: '', tytul: 'x', data: 'y' },
      { tytul: 'bez tokenu', data: 'y' },
      null,
    ])
    expect(parseRozmowy(raw)).toEqual([{ token: 'abc', tytul: 'Pomoc sąsiedzka', data: '2026-10-04' }])
  })
})
