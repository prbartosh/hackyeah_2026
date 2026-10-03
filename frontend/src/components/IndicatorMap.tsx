import { MAP_VIEWBOX, POWIATY_MAPA } from '@/lib/malopolskaMap'
import { formatValue, shortPowiat, type IndicatorTable } from '@/lib/indicator'

interface Props {
  table: IndicatorTable
  yearIdx: number
  selected: string[]
  active: string | null
  onActivate: (powiat: string | null) => void
  onToggle: (powiat: string) => void
  name: string
}

/** Mapa kartogramowa powiatów Małopolski: im ciemniejszy kolor, tym wyższa wartość w wybranym roku. */
export default function IndicatorMap({ table, yearIdx, selected, active, onActivate, onToggle, name }: Props) {
  const byPowiat = new Map(table.rows.map((r) => [r.powiat, r.values[yearIdx]]))
  const vals = [...byPowiat.values()].filter((v): v is number => v !== null)
  if (!vals.length) return <p className="empty">Brak danych do mapy.</p>
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  // Kolor według pozycji w rankingu (kwantyle), bo jeden duży powiat (Kraków) spłaszczałby skalę liniową
  const sorted = [...vals].sort((a, b) => a - b)
  const t = (v: number) => (sorted.length < 2 ? 0.5 : sorted.indexOf(v) / (sorted.length - 1))

  return (
    <figure className="zs-map">
      <svg viewBox={MAP_VIEWBOX} role="group" aria-label={`Mapa powiatów Małopolski: ${name}, rok ${table.years[yearIdx]}. Każdy powiat jest przyciskiem, który dodaje go do porównania.`} className="zs-map-svg">
        {POWIATY_MAPA.map((p) => {
          const v = byPowiat.get(p.powiat) ?? null
          const sel = selected.includes(p.powiat)
          const label = `${shortPowiat(p.powiat)}: ${formatValue(v, table.unit)}${sel ? ', wybrany do porównania' : ''}`
          return (
            <path
              key={p.powiat}
              d={p.d}
              role="button"
              tabIndex={0}
              aria-pressed={sel}
              aria-label={label}
              className={`zs-map-area${sel ? ' is-selected' : ''}${active === p.powiat ? ' is-active' : ''}${v === null ? ' is-empty' : ''}`}
              style={v === null ? undefined : { fill: `color-mix(in srgb, var(--zs-map-hi) ${Math.round(t(v) * 100)}%, var(--zs-map-lo))` }}
              onMouseEnter={() => onActivate(p.powiat)}
              onMouseLeave={() => onActivate(null)}
              onFocus={() => onActivate(p.powiat)}
              onBlur={() => onActivate(null)}
              onClick={() => onToggle(p.powiat)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onToggle(p.powiat)
                }
              }}
            />
          )
        })}
      </svg>
      <figcaption className="zs-map-legend">
        <span>najniższa: {formatValue(lo, table.unit)}</span>
        <span className="zs-map-ramp" aria-hidden="true" />
        <span>najwyższa: {formatValue(hi, table.unit)}</span>
      </figcaption>
    </figure>
  )
}
