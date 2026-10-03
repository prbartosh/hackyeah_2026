import { useChat } from '@/context/ChatContext'
import { useAccessibility } from '@/context/AccessibilityContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { PROBLEM_FIELDS } from '@/types/chat'

const WIDE_FROM = { normal: 75, large: 62, xlarge: 72 } as const

function PanelBody() {
  const { state, recentlyUpdated } = useChat()
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
