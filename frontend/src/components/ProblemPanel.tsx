import { useChat } from '@/context/ChatContext'
import { useAccessibility } from '@/context/AccessibilityContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { PROBLEM_FIELDS, type GminaStats, type WskaznikGminy } from '@/types/chat'

const WIDE_FROM = { normal: 75, large: 62, xlarge: 72 } as const
const VISIBLE_INDICATORS = 3

function Indicator({ w }: { w: WskaznikGminy }) {
  return (
    <li>
      <strong>{w.wartosc}</strong>{' '}
      <a href={w.url} target="_blank" rel="noreferrer">
        {w.nazwa}<span className="visually-hidden"> (otwiera się w nowej karcie)</span>
      </a>{' '}
      <span className="gmina-year">({w.rok})</span>
    </li>
  )
}

/** Wskaźniki gminy z Obserwatora: każdy z rokiem i linkiem, źródła pod listą. */
function GminaBlock({ gmina }: { gmina: GminaStats }) {
  const sources = [...new Set(gmina.obszary.flatMap((o) => o.wskazniki.map((w) => w.zrodlo)))]
  return (
    <section className="gmina-block" aria-labelledby="gmina-title">
      <h3 id="gmina-title" className="gmina-title">Dane gminy</h3>
      {gmina.obszary.map((o) => (
        <div key={`${o.nazwa}-${o.powiat}`} className="gmina-area">
          <p className="gmina-name">{o.nazwa}, {o.powiat}</p>
          <ul className="gmina-list">
            {o.wskazniki.slice(0, VISIBLE_INDICATORS).map((w) => <Indicator key={w.id} w={w} />)}
          </ul>
          {o.wskazniki.length > VISIBLE_INDICATORS && (
            <details className="gmina-more">
              <summary>Pozostałe wskaźniki ({o.wskazniki.length - VISIBLE_INDICATORS})</summary>
              <ul className="gmina-list">
                {o.wskazniki.slice(VISIBLE_INDICATORS).map((w) => <Indicator key={w.id} w={w} />)}
              </ul>
            </details>
          )}
        </div>
      ))}
      <p className="gmina-source">
        Źródło: <a href="https://obserwator.rops.krakow.pl" target="_blank" rel="noreferrer">
          Obserwator Statystyk Społecznych ROPS<span className="visually-hidden"> (otwiera się w nowej karcie)</span>
        </a>{sources.length > 0 && ` (${sources.join(', ')})`}
      </p>
    </section>
  )
}

function PanelBody() {
  const { state, recentlyUpdated, gmina } = useChat()
  return (
    <dl className="problem-list">
      {PROBLEM_FIELDS.map(({ key, label }) => {
        const value = state[key].tekst
        const isNew = recentlyUpdated.includes(key)
        return (
          <div key={key} className={`problem-row${isNew ? ' is-new' : ''}`}>
            <dt>
              {label}
              {isNew && <span className="new-tag">nowe</span>}
            </dt>
            <dd>
              {value ?? (
                <span className="empty">
                  <span aria-hidden="true">—</span>
                  <span className="visually-hidden">jeszcze nie ustalono</span>
                </span>
              )}
              {key === 'miejsca' && gmina && <GminaBlock gmina={gmina} />}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export default function ProblemPanel() {
  const { state } = useChat()
  const { fontSize } = useAccessibility()
  // Próg musi zgadzać się z układem w index.css
  const wide = useMediaQuery(`(min-width: ${WIDE_FROM[fontSize]}rem)`)
  const filled = PROBLEM_FIELDS.filter((f) => state[f.key].tekst).length

  if (wide) {
    return (
      <aside className="problem-panel" aria-labelledby="problem-title">
        <h2 id="problem-title" className="panel-title">Twój problem</h2>
        <PanelBody />
      </aside>
    )
  }
  return (
    <details className="problem-panel">
      <summary>
        <h2 className="panel-title">Twój problem</h2>
        <span className="panel-count">
          {filled}/{PROBLEM_FIELDS.length} — pokaż
        </span>
      </summary>
      <PanelBody />
    </details>
  )
}
