import { describe, expect, it } from 'vitest'
import { addItem, compareUrl, parseSlugs, parseStored, removeItem, toggleItem, type CompareItem } from './compare'

const a: CompareItem = { slug: 'a', nazwa: 'A' }
const b: CompareItem = { slug: 'b', nazwa: 'B' }
const c: CompareItem = { slug: 'c', nazwa: 'C' }
const d: CompareItem = { slug: 'd', nazwa: 'D' }

describe('dodawanie i usuwanie', () => {
  it('dodaje i nie powtarza', () => {
    expect(addItem([], a)).toEqual([a])
    expect(addItem([a], a)).toEqual([a])
  })
  it('limit 3 pozycji', () => {
    const full = [a, b, c]
    expect(addItem(full, d)).toBe(full)
  })
  it('usuwa po slugu', () => {
    expect(removeItem([a, b], 'a')).toEqual([b])
    expect(removeItem([a], 'x')).toEqual([a])
  })
  it('przełącza', () => {
    expect(toggleItem([a], b)).toEqual([a, b])
    expect(toggleItem([a, b], a)).toEqual([b])
    expect(toggleItem([a, b, c], d)).toEqual([a, b, c])
  })
})

describe('parseSlugs', () => {
  it('czyta powtarzane parametry slug', () => {
    expect(parseSlugs(new URLSearchParams('slug=merkury&slug=lazarz'))).toEqual(['merkury', 'lazarz'])
  })
  it('pomija duplikaty, puste i niepoprawne', () => {
    expect(parseSlugs(new URLSearchParams('slug=a&slug=a&slug=&slug=%3Cb%3E&slug=a/b&slug=c'))).toEqual(['a', 'c'])
  })
  it('ucina do 3', () => {
    expect(parseSlugs(new URLSearchParams('slug=a&slug=b&slug=c&slug=d'))).toEqual(['a', 'b', 'c'])
  })
  it('brak parametrów daje pustą listę', () => {
    expect(parseSlugs(new URLSearchParams(''))).toEqual([])
  })
})

describe('compareUrl', () => {
  it('buduje adres do skopiowania', () => {
    expect(compareUrl(['a', 'b'])).toBe('/porownaj?slug=a&slug=b')
  })
})

describe('parseStored', () => {
  it('odczytuje poprawny zapis', () => {
    expect(parseStored(JSON.stringify([a, b]))).toEqual([a, b])
  })
  it('odrzuca śmieci', () => {
    expect(parseStored(null)).toEqual([])
    expect(parseStored('nie json')).toEqual([])
    expect(parseStored('{"a":1}')).toEqual([])
    expect(parseStored(JSON.stringify([{ slug: 1 }, 'x', a, a]))).toEqual([a])
  })
  it('stosuje limit', () => {
    expect(parseStored(JSON.stringify([a, b, c, d]))).toEqual([a, b, c])
  })
})
