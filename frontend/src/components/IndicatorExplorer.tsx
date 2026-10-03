import { useEffect, useMemo, useState } from 'react'
import { Download, Minus, Pause, Play, TrendingDown, TrendingUp } from 'lucide-react'
import IndicatorMap from '@/components/IndicatorMap'
import { formatValue, meanSeries, shortPowiat, summarize, type IndicatorTable } from '@/lib/indicator'

const COLORS = ['var(--zs-s1)', 'var(--zs-s2)', 'var(--zs-s3)', 'var(--zs-s4)', 'var(--zs-s5)']
const DASHES = ['', '8 4', '2 4', '10 3 2 3', '14 4']
const MAX_SELECTED = 5

interface Props {
  table: IndicatorTable
  name: string
}

function lastYearWithData(table: IndicatorTable): number {
  for (let i = table.years.length - 1; i >= 0; i--) if (summarize(table, i)) return i
  return table.years.length - 1
}

function LineChart({ table, selected, name }: { table: IndicatorTable; selected: string[]; name: string }) {
  const W = 720, H = 300, L = 56, R = 16, T = 16, B = 34
  const mean = useMemo(() => meanSeries(table), [table])
  const series = [
    { key: '__mean', label: 'Średnia powiatów', values: mean, color: 'var(--text-muted)', dash: '3 5', mean: true },
    ...selected.map((p, i) => ({
      key: p,
      label: shortPowiat(p),
      values: table.rows.find((r) => r.powiat === p)?.values ?? [],
      color: COLORS[i % COLORS.length],
      dash: DASHES[i % DASHES.length],
      mean: false,
    })),
  ]
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null)
  if (!all.length) return <p className="empty">Brak danych do wykresu.</p>
  let lo = Math.min(...all), hi = Math.max(...all)
  if (lo === hi) { lo -= 1; hi += 1 }
  const pad = (hi - lo) * 0.08
  lo = lo >= 0 && lo - pad < 0 ? 0 : lo - pad
  hi += pad
  const n = table.years.length
  const x = (i: number) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1))
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const ticks = [0, 1, 2, 3, 4].map((k) => lo + ((hi - lo) * k) / 4)
  const yearStep = Math.ceil(n / 7)
  const path = (vals: (number | null)[]) => {
    let d = ''
    let pen = false
    vals.forEach((v, i) => {
      if (v === null) { pen = false; return }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`
      pen = true
    })
    return d
  }
  const label = `Wykres liniowy: ${name}, lata ${table.years[0]}–${table.years[n - 1]}. Serie: ${series.map((s) => s.label).join(', ')}. Pełne dane w tabeli poniżej.`

  return (
    <div className="zs-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="zs-svg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="zs-grid-line" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="zs-axis">{formatValue(t, table.unit)}</text>
          </g>
        ))}
        {table.years.map((yr, i) => (i % yearStep === 0 || i === n - 1) && (
          <text key={yr} x={x(i)} y={H - 10} textAnchor="middle" className="zs-axis">{yr}</text>
        ))}
        {series.map((s) => (
          <g key={s.key}>
            <path d={path(s.values)} fill="none" style={{ stroke: s.color }} strokeWidth={s.mean ? 2 : 3} strokeDasharray={s.dash} strokeLinecap="round" strokeLinejoin="round" />
            {!s.mean && s.values.map((v, i) => v !== null && <circle key={i} cx={x(i)} cy={y(v)} r={3.5} style={{ fill: s.color }} />)}
          </g>
        ))}
      </svg>
      <ul className="zs-legend">
        {series.map((s) => (
          <li key={s.key}>
            <svg width="28" height="10" aria-hidden="true">
              <line x1="1" x2="27" y1="5" y2="5" style={{ stroke: s.color }} strokeWidth="3" strokeDasharray={s.dash} strokeLinecap="round" />
            </svg>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PowiatCard({ table, yearIdx, powiat }: { table: IndicatorTable; yearIdx: number; powiat: string | null }) {
  const row = table.rows.find((r) => r.powiat === powiat)
  if (!row) {
    return <p className="hint">Najedź na powiat na mapie albo wybierz go z rankingu, żeby zobaczyć szczegóły.</p>
  }
  const v = row.values[yearIdx]
  const ranked = table.rows.filter((r) => r.values[yearIdx] !== null).sort((a, b) => (b.values[yearIdx] ?? 0) - (a.values[yearIdx] ?? 0))
  const rank = ranked.findIndex((r) => r.powiat === powiat) + 1
  const sum = summarize(table, yearIdx)
  const firstIdx = row.values.findIndex((x) => x !== null)
  const first = firstIdx >= 0 ? row.values[firstIdx] : null
  const diffMean = v !== null && sum ? v - sum.mean : null
  const diffFirst = v !== null && first !== null && firstIdx < yearIdx ? v - first : null
  const nums = row.values.filter((x): x is number => x !== null)
  const lo = Math.min(...nums), hi = Math.max(...nums)
  const pts = row.values
    .map((x, i) => (x === null ? null : `${(i / Math.max(table.years.length - 1, 1)) * 200},${hi === lo ? 20 : 36 - ((x - lo) / (hi - lo)) * 32}`))
    .filter(Boolean)
    .join(' ')
  const sign = (d: number) => `${d > 0 ? '+' : ''}${formatValue(d, table.unit)}`
  return (
    <div className="zs-pcard">
      <h4 className="zs-pcard-name">{powiat === null ? '' : shortPowiat(powiat)}</h4>
      <p className="zs-pcard-value">{formatValue(v, table.unit)}</p>
      <dl className="zs-pcard-facts">
        {rank > 0 && (<div><dt>Miejsce w rankingu</dt><dd>{rank}. z {ranked.length}</dd></div>)}
        {diffMean !== null && (<div><dt>Względem średniej</dt><dd>{sign(diffMean)}</dd></div>)}
        {diffFirst !== null && (<div><dt>Od {table.years[firstIdx]} roku</dt><dd>{sign(diffFirst)}</dd></div>)}
      </dl>
      {pts && (
        <svg viewBox="0 0 200 40" className="zs-spark" role="img" aria-label={`Przebieg ${table.years[0]}–${table.years[table.years.length - 1]}`}>
          <polyline points={pts} fill="none" style={{ stroke: 'var(--zs-s1)' }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

export default function IndicatorExplorer({ table, name }: Props) {
  const [yearIdx, setYearIdx] = useState(() => lastYearWithData(table))
  const [selected, setSelected] = useState<string[]>(() => {
    const s = summarize(table, lastYearWithData(table))
    return s ? [s.max.powiat, s.min.powiat] : []
  })
  const [active, setActive] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const year = table.years[yearIdx]
  const sum = summarize(table, yearIdx)
  const prevIdx = (() => {
    for (let i = yearIdx - 1; i >= 0; i--) if (summarize(table, i)) return i
    return -1
  })()
  const prev = prevIdx >= 0 ? summarize(table, prevIdx) : null
  const delta = sum && prev ? sum.mean - prev.mean : null
  const ranking = useMemo(
    () => table.rows
      .map((r) => ({ powiat: r.powiat, v: r.values[yearIdx] }))
      .filter((r): r is { powiat: string; v: number } => r.v !== null)
      .sort((a, b) => b.v - a.v),
    [table, yearIdx],
  )
  const shown = active ?? selected[selected.length - 1] ?? null

  // Animacja lat: co chwilę następny rok z danymi, zatrzymuje się na ostatnim
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setYearIdx((cur) => {
        for (let i = cur + 1; i < table.years.length; i++) if (summarize(table, i)) return i
        setPlaying(false)
        return cur
      })
    }, 900)
    return () => clearInterval(id)
  }, [playing, table])

  function togglePlay() {
    if (!playing) {
      // od początku, jeśli jesteśmy na końcu
      const atEnd = !table.years.some((_, i) => i > yearIdx && summarize(table, i))
      if (atEnd) setYearIdx(table.years.findIndex((_, i) => summarize(table, i)))
    }
    setPlaying((p) => !p)
  }

  const maxAbs = Math.max(...ranking.map((r) => Math.abs(r.v)), 1e-9)

  function toggle(p: string) {
    setSelected((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : cur.length >= MAX_SELECTED ? [...cur.slice(1), p] : [...cur, p])
  }

  function downloadCsv() {
    const rows = [['Powiat', ...table.years], ...table.rows.map((r) => [r.powiat, ...r.values.map((v) => (v === null ? '' : String(v)))])]
    const text = '﻿' + rows.map((r) => r.map((c) => `"${c}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
    a.download = `${name.toLocaleLowerCase('pl-PL').replace(/[^a-z0-9ąćęłńóśźż]+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const Trend = delta === null || Math.abs(delta) < 1e-9 ? Minus : delta > 0 ? TrendingUp : TrendingDown

  return (
    <div className="zs-explorer">
      <div className="zs-explorer-bar">
        <div className="zs-filter">
          <label htmlFor="zs-year">Rok</label>
          <select id="zs-year" className="select" value={yearIdx} onChange={(e) => { setPlaying(false); setYearIdx(Number(e.target.value)) }}>
            {table.years.map((y, i) => <option key={y} value={i} disabled={!summarize(table, i)}>{y}</option>)}
          </select>
        </div>
        <button type="button" className="btn btn-ghost" onClick={togglePlay} aria-pressed={playing}>
          {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          {playing ? 'Zatrzymaj' : 'Odtwórz lata'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={downloadCsv}>
          <Download size={18} aria-hidden="true" /> Pobierz dane (CSV)
        </button>
      </div>

      {sum ? (
        <dl className="zs-kpis" aria-label={`Podsumowanie za rok ${year}`}>
          <div className="zs-kpi">
            <dt>Średnia powiatów</dt>
            <dd>{formatValue(sum.mean, table.unit)}</dd>
            <dd className="zs-kpi-sub">
              <Trend size={16} aria-hidden="true" />
              {delta === null ? 'brak roku porównawczego' : `${delta > 0 ? '+' : ''}${formatValue(delta, table.unit)} vs ${table.years[prevIdx]}`}
            </dd>
          </div>
          <div className="zs-kpi"><dt>Najwyższa wartość</dt><dd>{formatValue(sum.max.value, table.unit)}</dd><dd className="zs-kpi-sub">{shortPowiat(sum.max.powiat)}</dd></div>
          <div className="zs-kpi"><dt>Najniższa wartość</dt><dd>{formatValue(sum.min.value, table.unit)}</dd><dd className="zs-kpi-sub">{shortPowiat(sum.min.powiat)}</dd></div>
          <div className="zs-kpi"><dt>Powiatów z danymi</dt><dd>{sum.count}</dd><dd className="zs-kpi-sub">z {table.rows.length}</dd></div>
        </dl>
      ) : <p className="empty">Brak danych za ten rok.</p>}

      <div className="zs-explorer-grid">
        <section aria-labelledby="zs-map-h" className="zs-panel">
          <h3 id="zs-map-h" className="zs-panel-h">Mapa powiatów, {year}</h3>
          <p className="hint">Ciemniejszy kolor oznacza wyższe miejsce w rankingu. Kliknij powiat, żeby dodać go do wykresu.</p>
          <div className="zs-map-layout">
            <IndicatorMap table={table} yearIdx={yearIdx} selected={selected} active={active} onActivate={setActive} onToggle={toggle} name={name} />
            <div className="zs-map-side" aria-live="polite"><PowiatCard table={table} yearIdx={yearIdx} powiat={shown} /></div>
          </div>
        </section>

        <section aria-labelledby="zs-trend-h" className="zs-panel">
          <h3 id="zs-trend-h" className="zs-panel-h">Zmiana w czasie</h3>
          <LineChart table={table} selected={selected} name={name} />
          {selected.length > 0 && (
            <button type="button" className="btn btn-ghost zs-clear" onClick={() => setSelected([])}>Wyczyść wybór powiatów</button>
          )}
          <p className="hint">Linia przerywana to zwykła średnia z powiatów (bez wag ludnościowych), nie wartość dla całego województwa.</p>
        </section>
        <section aria-labelledby="zs-rank-h" className="zs-panel">
          <h3 id="zs-rank-h" className="zs-panel-h">Ranking powiatów, {year}</h3>
          <p className="hint">Wybierz do 5 powiatów, żeby porównać je na wykresie powyżej.</p>
          <ul className="zs-bars">
            {ranking.map((r, i) => {
              const sel = selected.indexOf(r.powiat)
              return (
                <li key={r.powiat}>
                  <button type="button" className="zs-bar" aria-pressed={sel >= 0} onClick={() => toggle(r.powiat)}>
                    <span className="zs-bar-name"><span className="zs-bar-rank">{i + 1}.</span> {shortPowiat(r.powiat)}</span>
                    <span className="zs-bar-track" aria-hidden="true">
                      <span className="zs-bar-fill" style={{ width: `${Math.max((Math.abs(r.v) / maxAbs) * 100, 1.5)}%`, background: sel >= 0 ? COLORS[sel % COLORS.length] : undefined }} />
                    </span>
                    <span className="zs-bar-val">{formatValue(r.v, table.unit)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

      </div>

      <details className="zs-table-wrap">
        <summary>Tabela wszystkich danych ({table.rows.length} powiatów, {table.years.length} lat)</summary>
        <div className="zs-table-scroll" tabIndex={0} role="region" aria-label={`Tabela: ${name}`}>
          <table className="zs-table">
            <thead><tr><th scope="col">Powiat</th>{table.years.map((y) => <th key={y} scope="col">{y}</th>)}</tr></thead>
            <tbody>
              {table.rows.map((r) => (
                <tr key={r.powiat}>
                  <th scope="row">{shortPowiat(r.powiat)}</th>
                  {r.values.map((v, i) => <td key={i}>{v === null ? '–' : formatValue(v, table.unit)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
