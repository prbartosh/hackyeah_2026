import { useChat } from '@/context/ChatContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { PROBLEM_FIELDS, ROLE_LABELS } from '@/types/chat'

function PanelBody() {
  const { problem, role, recentlyUpdated } = useChat()
  return (
    <>
      <p className="panel-intro">
        Uzupełnia się w trakcie rozmowy. Na tej podstawie dobieramy rozwiązania.
      </p>
      <dl className="problem-list">
        <div className="problem-row">
          <dt>Piszesz jako</dt>
          <dd>{role ? ROLE_LABELS[role] : <span className="empty">jeszcze nie ustalono</span>}</dd>
        </div>
        {PROBLEM_FIELDS.map(({ key, label }) => (
          <div key={key} className={`problem-row${recentlyUpdated.includes(key) ? ' is-new' : ''}`}>
            <dt>
              {label}
              {recentlyUpdated.includes(key) && <span className="new-tag">nowe</span>}
            </dt>
            <dd>{problem[key] ?? <span className="empty">jeszcze nie ustalono</span>}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

/** Panel „Twój problem”: obok czatu na szerokim ekranie, zwijany nad czatem na wąskim. */
export default function ProblemPanel() {
  const { problem } = useChat()
  const wide = useMediaQuery('(min-width: 62rem)')
  const filled = PROBLEM_FIELDS.filter((f) => problem[f.key]).length

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
          uzupełniono {filled} z {PROBLEM_FIELDS.length} — pokaż
        </span>
      </summary>
      <PanelBody />
    </details>
  )
}
