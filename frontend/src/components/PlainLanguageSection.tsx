import { useRef, useState } from 'react'
import { BookOpenText } from 'lucide-react'
import { AdminApiError } from '@/admin/api'
import { getPlainLanguage, type PlainLanguageResponse } from '@/api/plainLanguage'
import ReadAloudButton from '@/components/ReadAloudButton'

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; data: PlainLanguageResponse }
  | { kind: 'error'; message: string }

/** „Powiedz prościej”: opis innowacji w tekście łatwym do czytania (ETR), na żądanie. */
export default function PlainLanguageSection({ slug }: { slug: string }) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const headingRef = useRef<HTMLHeadingElement>(null)

  const load = async () => {
    setState({ kind: 'loading' })
    try {
      const data = await getPlainLanguage(slug)
      setState({ kind: 'done', data })
      // Po wczytaniu czytnik ekranu i klawiatura zaczynają od nowego tekstu
      requestAnimationFrame(() => headingRef.current?.focus())
    } catch (e) {
      setState({ kind: 'error', message: e instanceof AdminApiError ? e.message : 'Nie udało się uprościć opisu.' })
    }
  }

  if (state.kind === 'done') {
    const { zdania, zrodlo } = state.data
    return (
      <section className="plain-box" aria-labelledby="plain-title">
        <h2 id="plain-title" ref={headingRef} tabIndex={-1}>W prostych słowach</h2>
        <ul className="plain-list">
          {zdania.map((z, i) => <li key={i}>{z}</li>)}
        </ul>
        <div className="btn-row">
          <ReadAloudButton text={zdania.join(' ')} label="Przeczytaj na głos" />
        </div>
        <p className="hint">
          Tekst uproszczony przez AI na podstawie <a href={zrodlo} target="_blank" rel="noreferrer">opisu w Bibliotece ROPS<span className="visually-hidden"> (otwiera się w nowej karcie)</span></a>. Szczegóły i pełny opis są niżej.
        </p>
      </section>
    )
  }

  return (
    <div className="plain-cta">
      <button type="button" className="btn btn-secondary" onClick={load} disabled={state.kind === 'loading'}>
        <BookOpenText size={18} aria-hidden="true" />
        {state.kind === 'loading' ? 'Upraszczam opis…' : 'Powiedz prościej'}
      </button>
      <p className="hint">Krótkie zdania, bez trudnych słów (tekst łatwy do czytania).</p>
      <p role="status" className="visually-hidden">{state.kind === 'loading' ? 'Upraszczam opis, to potrwa kilka sekund.' : ''}</p>
      {state.kind === 'error' && <p className="alert alert-error" role="alert">{state.message}</p>}
    </div>
  )
}
