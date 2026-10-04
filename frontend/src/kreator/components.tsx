import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, ExternalLink, Lightbulb, Sparkles, TriangleAlert } from 'lucide-react'
import { errorText, ErrorBox } from '@/admin/ui'
import '@/styles/admin.css'
import '@/styles/kreator.css'
import { counterText, limitAnnouncement } from '@/kreator/helpers'
import { kreator } from '@/kreator/api'
import { SAVE_TEXT, type SaveState } from '@/kreator/useAutosave'
import type { Asystent, PodobnaInnowacja } from '@/kreator/types'

/** Stan autozapisu: tekstem i ikoną, dla czytnika ekranu w regionie `status`. */
export function SaveStatus({ state, onRetry }: { state: SaveState; onRetry?: () => void }) {
  return (
    <p className={`save-status save-${state}`} role="status">
      {state === 'saved' && <Check size={16} aria-hidden="true" />}
      {state === 'error' && <TriangleAlert size={16} aria-hidden="true" />}
      <span>{SAVE_TEXT[state]}</span>
      {state === 'error' && onRetry && (
        <button type="button" className="btn btn-ghost" onClick={onRetry}>Spróbuj ponownie</button>
      )}
    </p>
  )
}

/** Pasek postępu krokowego formularza: widoczny tekst „Krok X z Y” i rola `progressbar`. */
export function StepProgress({ current, titles }: { current: number; titles: string[] }) {
  const total = titles.length
  return (
    <div className="step-progress">
      <p className="step-count">Krok {current + 1} z {total}: {titles[current]}</p>
      <div
        className="progress-track" role="progressbar" aria-label="Postęp wypełniania"
        aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1}
        aria-valuetext={`Krok ${current + 1} z ${total}: ${titles[current]}`}
      >
        <div className="progress-fill" style={{ width: `${((current + 1) / total) * 100}%` }} />
      </div>
    </div>
  )
}

export function AiTag({ children = 'Wypełnione przez AI: sprawdź i popraw' }: { children?: string }) {
  return (
    <span className="tag tag-ai">
      <Sparkles size={14} aria-hidden="true" /> {children}
    </span>
  )
}

export function MissingTag() {
  return (
    <span className="tag tag-warn">
      <TriangleAlert size={14} aria-hidden="true" /> Do uzupełnienia
    </span>
  )
}

interface LimitedTextareaProps {
  id: string
  label: string
  value: string
  limit: number
  onChange: (value: string) => void
  hint?: string
  error?: string
  rows?: number
  badges?: ReactNode
  autoFocus?: boolean
}

/** Pole tekstowe z etykietą, podpowiedzią, licznikiem znaków i komunikatem błędu przy polu. */
export function LimitedTextarea({
  id, label, value, limit, onChange, hint, error, rows = 5, badges, autoFocus,
}: LimitedTextareaProps) {
  const describedBy = [hint && `${id}-hint`, `${id}-count`, error && `${id}-error`].filter(Boolean).join(' ')
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {badges && <div className="field-badges">{badges}</div>}
      {hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
      <textarea
        id={id} className="textarea" rows={rows} value={value} maxLength={limit} autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined} aria-describedby={describedBy}
      />
      <p id={`${id}-count`} className="counter">{counterText(value.length, limit)}</p>
      <p className="visually-hidden" role="status">{limitAnnouncement(value.length, limit)}</p>
      {error && <p id={`${id}-error`} className="field-error" role="alert">{error}</p>}
    </div>
  )
}

/** „Takie rozwiązanie już działa, zobacz”: podobne innowacje z bazy ROPS, każda ze źródłem. */
export function SimilarInnovations({ token, refreshKey }: { token: string | null; refreshKey?: string }) {
  const [state, setState] = useState<{ items?: PodobnaInnowacja[]; error?: string; loading: boolean }>({ loading: false })

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setState((s) => ({ ...s, loading: true }))
      kreator.podobne(token)
        .then((r) => !cancelled && setState({ items: r.items, loading: false }))
        .catch((e) => !cancelled && setState({ error: errorText(e), loading: false }))
    }, 1200)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [token, refreshKey])

  if (!token) return null
  return (
    <section className="similar" aria-labelledby="similar-title" aria-busy={state.loading}>
      <h2 id="similar-title"><Lightbulb size={20} aria-hidden="true" /> Takie rozwiązania już działają</h2>
      {state.error && <p className="hint">{state.error}</p>}
      {state.items && state.items.length === 0 && (
        <p className="hint">Nie znaleźliśmy w bazie ROPS rozwiązania podobnego do Twojego opisu. To może być coś nowego.</p>
      )}
      {state.items && state.items.length > 0 && (
        <>
          <p className="hint">Zobacz, zanim zgłosisz pomysł: być może da się z nich skorzystać lub się nimi zainspirować.</p>
          <ul className="plain-list">
            {state.items.map((i) => (
              <li key={i.slug} className="similar-item">
                <Link to={`/innowacja/${i.slug}`} className="similar-name">{i.nazwa}</Link>
                {i.problem && <p>{i.problem}</p>}
                {i.powody.length > 0 && <p className="hint">Pasuje, bo: {i.powody.join(', ')}.</p>}
                <p className="hint">
                  Źródło: <a href={i.url} target="_blank" rel="noreferrer">{i.zrodlo}<span className="visually-hidden"> (otwiera się w nowej karcie)</span> <ExternalLink size={14} aria-hidden="true" /></a>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="hint">
        Trafność może sprawdzać zewnętrzny model AI (TypeSafe), do którego trafia opis pomysłu. Nie wpisuj danych wrażliwych.
      </p>
    </section>
  )
}

/** Asystent kreatora: braki w fiszce, pytania doprecyzowujące (AI, na prośbę) i kolejne kroki. */
export function AssistantPanel({ token }: { token: string }) {
  const [data, setData] = useState<Asystent | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function ask() {
    setBusy(true)
    setError('')
    try {
      setData(await kreator.asystent(token))
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="assistant panel" aria-labelledby="assistant-title">
      <h3 id="assistant-title"><Lightbulb size={20} aria-hidden="true" /> Asystent: dopracuj pomysł</h3>
      <p className="hint">Zada kilka pytań i wskaże, czego jeszcze brakuje w fiszce. Nie dopisuje niczego za Ciebie.</p>
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={ask} disabled={busy}>
          {busy ? 'Myślę…' : data ? 'Zapytaj ponownie' : 'Zadaj mi pytania'}
        </button>
      </div>
      {error && <ErrorBox message={error} />}
      <div aria-live="polite">
        {data && (
          <>
            {data.komunikat && <p className="alert alert-note">{data.komunikat}</p>}
            {data.braki.length > 0 && (
              <>
                <h4>Czego brakuje w fiszce</h4>
                <ul>{data.braki.map((b) => <li key={b}>{b}</li>)}</ul>
              </>
            )}
            {data.pytania.length > 0 && (
              <>
                <h4>Pytania do przemyślenia <AiTag>Pytania od AI</AiTag></h4>
                <ul>{data.pytania.map((q) => <li key={q}>{q}</li>)}</ul>
              </>
            )}
            <h4>Kolejne kroki prototypowania</h4>
            <ul>{data.kolejne_kroki.map((s) => <li key={s}>{s}</li>)}</ul>
            <p className="hint">Podpowiedzi są ogólne. Więcej materiałów: <Link to="/zasobnik">Zasobnik wiedzy</Link>.</p>
          </>
        )}
      </div>
    </section>
  )
}
