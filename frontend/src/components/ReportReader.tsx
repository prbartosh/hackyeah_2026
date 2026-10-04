import { Fragment, useEffect, useMemo, useRef } from 'react'
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { fold, type Block, type ParsedReport } from '@/lib/reportText'

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Tekst z wyróżnieniem szukanej frazy i pogrubionymi wartościami procentowymi. */
function Rich({ text, query }: { text: string; query: string }) {
  const parts = useMemo(() => {
    const q = fold(query.trim())
    const haystack = fold(text)
    const re = new RegExp(`${q.length >= 2 ? `(${escapeRe(q)})|` : ''}(\\d+(?:[,.]\\d+)?\\s?%)`, 'g')
    const out: { s: string; kind: 'hit' | 'num' | null }[] = []
    let last = 0
    for (const m of haystack.matchAll(re)) {
      if (m.index > last) out.push({ s: text.slice(last, m.index), kind: null })
      const isHit = q.length >= 2 && m[1] !== undefined
      out.push({ s: text.slice(m.index, m.index + m[0].length), kind: isHit ? 'hit' : 'num' })
      last = m.index + m[0].length
    }
    if (last < text.length) out.push({ s: text.slice(last), kind: null })
    return out
  }, [text, query])
  return (
    <>
      {parts.map((p, i) => p.kind === 'hit' ? <mark key={i} className="zs-hit">{p.s}</mark> : p.kind === 'num' ? <strong key={i} className="zs-num">{p.s}</strong> : <Fragment key={i}>{p.s}</Fragment>)}
    </>
  )
}

function Blocks({ blocks, query }: { blocks: Block[]; query: string }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h':
            return b.level === 2
              ? <h2 key={i} id={b.id} className="zs-r-h2" tabIndex={-1}><Rich text={b.text} query={query} /></h2>
              : <h3 key={i} id={b.id} className="zs-r-h3" tabIndex={-1}><Rich text={b.text} query={query} /></h3>
          case 'p':
            return <p key={i} className="zs-r-p"><Rich text={b.text} query={query} /></p>
          case 'ul':
            return (
              <ul key={i} className="zs-r-points">
                {b.items.map((it, j) => (
                  <li key={j}><Check size={16} aria-hidden="true" /><span><Rich text={it} query={query} /></span></li>
                ))}
              </ul>
            )
          case 'dl':
            return (
              <dl key={i} className="zs-r-glossary">
                {b.items.map(([k, v], j) => (
                  <div key={j}><dt>{k}</dt><dd><Rich text={v} query={query} /></dd></div>
                ))}
              </dl>
            )
          case 'note':
            return <p key={i} className="zs-r-note"><span className="visually-hidden">Przypis: </span><Rich text={b.text} query={query} /></p>
          case 'label':
            return <p key={i} className="zs-r-label"><Rich text={b.text} query={query} /></p>
          case 'page':
            return b.page > 0 ? <div key={i} id={`strona-${b.page}`} className="zs-r-pagemark" role="separator" aria-label={b.label ?? `Strona ${b.page}`}><span>{b.label ?? `strona ${b.page}`}</span></div> : null
        }
      })}
    </>
  )
}

interface SearchProps {
  query: string
  setQuery: (q: string) => void
  onStep: (d: 1 | -1) => void
  current: number
  total: number
}

/** Pole szukania w dokumencie z licznikiem i przechodzeniem między trafieniami. */
export function ReportSearch({ query, setQuery, onStep, current, total }: SearchProps) {
  return (
    <div className="zs-r-search" role="search" data-tour="zasobnik-raport-szukaj">
      <label htmlFor="zs-r-q" className="visually-hidden">Szukaj w treści dokumentu</label>
      <Search size={18} aria-hidden="true" />
      <input id="zs-r-q" data-tour="zasobnik-raport-szukaj-pole" type="search" className="zs-r-search-input" placeholder="Szukaj w treści…" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
      {query.trim().length >= 2 && (
        <>
          <span role="status" className="zs-r-search-count">{total ? `${current + 1} z ${total}` : 'brak trafień'}</span>
          <button type="button" className="zs-icon-btn" onClick={() => onStep(-1)} disabled={!total} aria-label="Poprzednie trafienie"><ChevronUp size={18} aria-hidden="true" /></button>
          <button type="button" className="zs-icon-btn" onClick={() => onStep(1)} disabled={!total} aria-label="Następne trafienie"><ChevronDown size={18} aria-hidden="true" /></button>
          <button type="button" className="zs-icon-btn" onClick={() => setQuery('')} aria-label="Wyczyść wyszukiwanie"><X size={18} aria-hidden="true" /></button>
        </>
      )}
    </div>
  )
}

/** Treść raportu: czytelny artykuł z nagłówkami, punktami i przypisami. */
export default function ReportReader({ report, query, hitIndex }: { report: ParsedReport; query: string; hitIndex: number }) {
  const ref = useRef<HTMLDivElement>(null)

  // Bieżące trafienie wyróżnione i przewinięte do widoku
  useEffect(() => {
    const marks = ref.current?.querySelectorAll<HTMLElement>('mark.zs-hit')
    marks?.forEach((m, i) => m.classList.toggle('is-current', i === hitIndex))
    if (marks?.length && query.trim().length >= 2) marks[Math.min(hitIndex, marks.length - 1)]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [hitIndex, query, report])

  return (
    <div ref={ref} className="zs-r-body">
      {report.front.length > 0 && (
        <details className="zs-r-front">
          <summary>Strona tytułowa i informacje o publikacji</summary>
          <Blocks blocks={report.front} query={query} />
        </details>
      )}
      <Blocks blocks={report.blocks} query={query} />
    </div>
  )
}
