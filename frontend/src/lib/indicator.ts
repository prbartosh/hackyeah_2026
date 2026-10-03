// Tabela „Powiat × rok” z wersji tekstowej wskaźnika Obserwatora (assets/obserwator/text/*.md).
export interface PowiatSeries {
  powiat: string
  /** Wartość na rok (indeks jak w `years`), null = brak danych. */
  values: (number | null)[]
}

export interface IndicatorTable {
  years: string[]
  rows: PowiatSeries[]
  /** Jednostka rozpoznana z komórek: „%” albo pusta. */
  unit: '%' | ''
}

const parseCell = (cell: string): number | null => {
  const n = Number(cell.trim().replace('%', '').replace(',', '.'))
  return cell.trim() === '' || !Number.isFinite(n) ? null : n
}

export function parseIndicatorTable(tresc: string | null): IndicatorTable | null {
  if (!tresc) return null
  const lines = tresc.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|'))
  const header = lines.find((l) => /^\|\s*Powiat\s*\|/i.test(l))
  if (!header) return null
  const years = header.split('|').slice(2, -1).map((s) => s.trim())
  const rows: PowiatSeries[] = []
  let unit: '%' | '' = ''
  for (const line of lines) {
    if (line === header || /^\|\s*-/.test(line)) continue
    const cells = line.split('|').slice(1, -1)
    if (cells.length < 2) continue
    if (cells.some((c) => c.includes('%'))) unit = '%'
    rows.push({ powiat: cells[0].trim(), values: years.map((_, i) => parseCell(cells[i + 1] ?? '')) })
  }
  return rows.length && years.length ? { years, rows, unit } : null
}

export const shortPowiat = (p: string) => p.replace(/^powiat\s+/i, '').replace(/^m\.\s*/i, 'm. ')

export function formatValue(v: number | null, unit: '%' | ''): string {
  if (v === null) return 'brak danych'
  const abs = Math.abs(v)
  const digits = abs >= 1000 || Number.isInteger(v) ? 0 : abs >= 100 ? 1 : 2
  return `${v.toLocaleString('pl-PL', ({ maximumFractionDigits: digits, useGrouping: 'always' } as unknown as Intl.NumberFormatOptions))}${unit === '%' ? '%' : ''}`
}

export interface Summary {
  min: { powiat: string; value: number }
  max: { powiat: string; value: number }
  mean: number
  count: number
}

/** Podsumowanie powiatów dla jednego roku (indeks w `years`). */
export function summarize(table: IndicatorTable, yearIdx: number): Summary | null {
  const vals = table.rows
    .map((r) => ({ powiat: r.powiat, value: r.values[yearIdx] }))
    .filter((r): r is { powiat: string; value: number } => r.value !== null)
  if (!vals.length) return null
  const sorted = [...vals].sort((a, b) => a.value - b.value)
  return { min: sorted[0], max: sorted[sorted.length - 1], mean: vals.reduce((s, r) => s + r.value, 0) / vals.length, count: vals.length }
}

/** Średnia z powiatów na rok (nie jest wartością dla całego województwa: brak wag ludnościowych). */
export function meanSeries(table: IndicatorTable): (number | null)[] {
  return table.years.map((_, i) => summarize(table, i)?.mean ?? null)
}
