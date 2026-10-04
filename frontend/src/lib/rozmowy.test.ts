import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readRozmowy, rozmowaPath, saveRozmowa } from './rozmowy'

describe('rozmowy', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    })
  })

  it('zapisuje rozmowy bez duplikatów, najnowsza pierwsza', () => {
    saveRozmowa({ token: 'a', tytul: 'A', data: '2026-10-04' })
    saveRozmowa({ token: 'b', tytul: 'B', data: '2026-10-05' })
    saveRozmowa({ token: 'a', tytul: 'A2', data: '2026-10-06' })
    expect(readRozmowy().map((r) => r.token)).toEqual(['a', 'b'])
    expect(readRozmowy()[0].tytul).toBe('A2')
  })

  it('znosi uszkodzony zapis', () => {
    localStorage.setItem('splot-rozmowy', '{nie json')
    expect(readRozmowy()).toEqual([])
    localStorage.setItem('splot-rozmowy', '[1, {"token": "x"}]')
    expect(readRozmowy()).toEqual([])
  })

  it('buduje ścieżkę', () => {
    expect(rozmowaPath('a b')).toBe('/rozmowa/a%20b')
  })
})
