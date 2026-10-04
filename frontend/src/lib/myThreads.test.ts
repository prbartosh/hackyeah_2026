import { describe, expect, it } from 'vitest'
import { parseStored, snippet, upsertThread } from './myThreads'

const now = new Date('2026-10-04T10:00:00Z')

describe('upsertThread', () => {
  it('dodaje na początek i nie powtarza tokenu', () => {
    const a = upsertThread([], 'a', 'Pierwsza sprawa', now)
    const b = upsertThread(a, 'b', 'Druga', now)
    expect(b.map((t) => t.token)).toEqual(['b', 'a'])
    expect(upsertThread(b, 'a', '', now).map((t) => t.token)).toEqual(['a', 'b'])
  })
  it('pusty opis nie nadpisuje starego', () => {
    const a = upsertThread([], 'a', 'Opis', now)
    expect(upsertThread(a, 'a', '', now)[0].opis).toBe('Opis')
  })
  it('trzyma najwyżej 20 wpisów', () => {
    let list = upsertThread([], 't0', '', now)
    for (let i = 1; i < 30; i++) list = upsertThread(list, `t${i}`, '', now)
    expect(list).toHaveLength(20)
    expect(list[0].token).toBe('t29')
  })
})

describe('parseStored', () => {
  it('odporny na śmieci', () => {
    expect(parseStored(null)).toEqual([])
    expect(parseStored('nie json')).toEqual([])
    expect(parseStored('{"a":1}')).toEqual([])
    expect(parseStored('[1, null, {"token": ""}, {"token": "x"}]')).toEqual([
      { token: 'x', opis: '', zapisano: '' },
    ])
  })
})

describe('snippet', () => {
  it('skraca i zwija białe znaki', () => {
    expect(snippet('a\n\n b')).toBe('a b')
    expect(snippet('x'.repeat(100))).toHaveLength(81)
  })
})
