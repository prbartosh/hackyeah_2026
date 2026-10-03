import { describe, expect, it } from 'vitest'
import { formatValue, meanSeries, parseIndicatorTable, summarize } from './indicator'

const MD = `# X
## Wartości według powiatów (Małopolska)

| Powiat | 2023 | 2024 |
|---|---|---|
| powiat bocheński | 10.50% | 12.00% |
| powiat brzeski | 8.00% |  |
`

describe('parseIndicatorTable', () => {
  it('czyta lata, powiaty i brakujące wartości', () => {
    const t = parseIndicatorTable(MD)!
    expect(t.years).toEqual(['2023', '2024'])
    expect(t.unit).toBe('%')
    expect(t.rows[1].values).toEqual([8, null])
  })
  it('zwraca null bez tabeli', () => {
    expect(parseIndicatorTable('# brak')).toBeNull()
    expect(parseIndicatorTable(null)).toBeNull()
  })
  it('podsumowuje rok i średnie', () => {
    const t = parseIndicatorTable(MD)!
    expect(summarize(t, 0)?.max.powiat).toBe('powiat bocheński')
    expect(summarize(t, 1)?.count).toBe(1)
    expect(meanSeries(t)).toEqual([9.25, 12])
  })
  it('formatuje wartości', () => {
    expect(formatValue(12.5, '%')).toBe('12,5%')
    expect(formatValue(null, '')).toBe('brak danych')
  })
})
