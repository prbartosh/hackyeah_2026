import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { parseReport } from './reportText'

const dir = '../assets/raporty/text'
const load = (prefix: string) => readFileSync(`${dir}/${readdirSync(dir).find((f) => f.startsWith(prefix))!}`, 'utf8')

describe('parseReport', () => {
  it('zwraca pusty wynik bez tekstu', () => {
    expect(parseReport(null).blocks).toEqual([])
  })

  it('skleja łamane wiersze, rozpoznaje nagłówki, wypunktowania i przypisy', () => {
    const r = parseReport(load('1348-'))
    const names = r.headings.map((h) => h.text)
    expect(names).toContain('WSTĘP')
    expect(names).toContain('ASYSTENCI RODZINY')
    expect(r.headings.filter((h) => h.level === 2).length).toBeGreaterThan(10)
    expect(r.blocks.some((b) => b.t === 'ul')).toBe(true)
    expect(r.blocks.some((b) => b.t === 'note')).toBe(true)
    expect(r.blocks.some((b) => b.t === 'dl')).toBe(true)
    // brak śladów numeracji stron PDF i spisu treści
    const all = JSON.stringify(r.blocks)
    expect(all).not.toMatch(/str\. \d+/)
    expect(all).not.toContain('.....')
    // akapity nie zawierają złamań wiersza
    expect(r.blocks.filter((b) => b.t === 'p').every((b) => b.t === 'p' && !b.text.includes('\n'))).toBe(true)
  })

  it('wszystkie raporty parsują się bez błędu', () => {
    for (const f of readdirSync(dir)) {
      const r = parseReport(readFileSync(`${dir}/${f}`, 'utf8'))
      expect(r.blocks.length).toBeGreaterThan(0)
    }
  })
})
