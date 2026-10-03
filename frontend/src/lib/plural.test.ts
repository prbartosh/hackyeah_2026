import { describe, expect, it } from 'vitest'
import { liczbaInnowacji, plural } from './plural'

describe('liczbaInnowacji', () => {
  it('odmienia po polsku', () => {
    expect(liczbaInnowacji(1)).toBe('1 innowacja')
    expect(liczbaInnowacji(2)).toBe('2 innowacje')
    expect(liczbaInnowacji(5)).toBe('5 innowacji')
    expect(liczbaInnowacji(12)).toBe('12 innowacji')
    expect(liczbaInnowacji(22)).toBe('22 innowacje')
    expect(liczbaInnowacji(115)).toBe('115 innowacji')
  })
})

describe('plural', () => {
  it('odmienia dowolny rzeczownik', () => {
    expect(plural(0, 'ocena', 'oceny', 'ocen')).toBe('0 ocen')
    expect(plural(1, 'ocena', 'oceny', 'ocen')).toBe('1 ocena')
    expect(plural(3, 'ocena', 'oceny', 'ocen')).toBe('3 oceny')
    expect(plural(14, 'ocena', 'oceny', 'ocen')).toBe('14 ocen')
  })
})
