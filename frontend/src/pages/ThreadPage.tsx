import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/admin/api'
import { ErrorBox, Loading, errorText, formatDate, useLoad } from '@/admin/ui'
import type { ThreadMessage } from '@/admin/types'
import MyThreadsList from '@/components/MyThreadsList'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { loadThreads, saveThread } from '@/lib/myThreads'
import '@/styles/admin.css'

const MAX_LENGTH = 4000

const ROLE_LABELS: Record<ThreadMessage['autor_rola'], string> = {
  uzytkownik: 'Ty',
  admin: 'ROPS',
  mentor: 'Mentor',
}

function Reply({ token, onSent }: { token: string; onSent: () => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) {
      setError('Napisz wiadomość, zanim ją wyślesz.')
      area.current?.focus()
      return
    }
    setBusy(true)
    setError('')
    setSent('')
    try {
      await api.replyInThread(token, text.trim())
      setText('')
      setSent('Wiadomość wysłana. Zespół ROPS dostał powiadomienie.')
      onSent()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
      area.current?.focus()
    }
  }

  return (
    <form onSubmit={submit} className="stack thread-reply" noValidate>
      <div className="field">
        <label htmlFor="t-reply">Twoja wiadomość</label>
        <textarea id="t-reply" ref={area} className="textarea" rows={4} value={text} maxLength={MAX_LENGTH}
          onChange={(e) => setText(e.target.value)} aria-invalid={error ? true : undefined}
          aria-describedby="t-reply-count t-reply-error" />
        <p id="t-reply-count" className="hint">{text.length} / {MAX_LENGTH} znaków</p>
      </div>
      <p id="t-reply-error" className="field-error" role="alert">{error}</p>
      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Wysyłanie…' : 'Wyślij wiadomość'}</button>
      </div>
      <p role="status" className="status-ok">{sent}</p>
    </form>
  )
}

/** Publiczny widok rozmowy: autor zgłoszenia widzi swoje zgłoszenie i odpowiedzi oraz może dopisać. */
export default function ThreadPage() {
  const { token = '' } = useParams()
  useDocumentTitle('Twoje zgłoszenie · Splot')
  const { data, error, loading, reload } = useLoad(() => api.publicThread(token), [token])
  const [firstVisit, setFirstVisit] = useState(false)
  const [copied, setCopied] = useState('')
  const firstText = data?.wiadomosci[0]?.tresc

  // Wątek istnieje (dane wczytane): zapamiętujemy go w „Moich sprawach”; pierwszy raz pokazujemy podpowiedź.
  useEffect(() => {
    if (!token || firstText === undefined) return
    if (!loadThreads().some((t) => t.token === token)) setFirstVisit(true)
    saveThread(token, firstText)
  }, [token, firstText])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/watek/${token}`)
      setCopied('Link skopiowany.')
    } catch {
      setCopied('Nie udało się skopiować. Skopiuj adres z paska przeglądarki.')
    }
  }

  return (
    <div className="container page">
      <h1>Twoje zgłoszenie</h1>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          {firstVisit && <p className="alert alert-note">Zapisz ten link, to Twój dostęp do sprawy.</p>}
          <p>
            {data.status === 'odpowiedziane'
              ? 'Zespół ROPS odpowiedział na zgłoszenie. Możesz dopisać kolejną wiadomość.'
              : 'Zgłoszenie czeka na odpowiedź zespołu ROPS. Wróć na tę stronę później.'}
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={copyLink}>Skopiuj link do wątku</button>
          </div>
          <p role="status" className="hint">{copied}</p>
          <ol className="thread chat-thread" aria-label="Rozmowa">
            {data.wiadomosci.map((m, i) => (
              <li key={i} className={`msg-${m.autor_rola === 'uzytkownik' ? 'author' : m.autor_rola}`}>
                <p className="hint">
                  <strong>{ROLE_LABELS[m.autor_rola]}</strong> · {formatDate(m.created_at)}
                </p>
                <p className="pre">{m.tresc}</p>
                {m.zrodla && m.zrodla.length > 0 && (
                  <p className="hint">
                    Rozwiązania z bazy: {m.zrodla.map((s, j) => (
                      <span key={s.slug}>{j > 0 && ', '}<Link to={`/innowacja/${s.slug}`}>{s.nazwa}</Link></span>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ol>
          <Reply token={token} onSent={reload} />
          <MyThreadsList title="Inne Twoje sprawy" exclude={token} hideWhenEmpty />
        </>
      )}
    </div>
  )
}
