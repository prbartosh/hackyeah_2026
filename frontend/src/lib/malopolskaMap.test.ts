import { describe, expect, it } from 'vitest'
import { POWIATY_MAPA } from './malopolskaMap'
import { parseIndicatorTable } from './indicator'
import { readFileSync, readdirSync } from 'node:fs'

describe('mapa powiatów', () => {
  it('ma 22 powiaty z geometrią', () => {
    expect(POWIATY_MAPA).toHaveLength(22)
    for (const p of POWIATY_MAPA) expect(p.d.length).toBeGreaterThan(50)
  })
  it('nazwy zgadzają się z tabelami Obserwatora', () => {
    const dir = '../assets/obserwator/text'
    const file = readdirSync(dir).find((f) => f.startsWith('186-'))!
    const table = parseIndicatorTable(readFileSync(`${dir}/${file}`, 'utf8'))!
    expect(POWIATY_MAPA.map((p) => p.powiat).sort()).toEqual(table.rows.map((r) => r.powiat).sort())
  })
})
