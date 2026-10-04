import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/admin/api'
import { ErrorBox, Loading, errorText, formatDate, useLoad } from '@/admin/ui'
import type { PublicThread } from '@/admin/types'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import '@/styles/admin.css'

/** Odpowiedź autora w wątku: dopytanie ROPS albo odpowiedź na przekazane pytanie. */
function ReplyForm({ token, onSent }: { token: string; onSent: (data: PublicThread) => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (text.trim().length < 2) {
      setError('Wpisz treść wiadomości.')
      return
    }
    setBusy(true)
    setError('')
    setSent(false)
    try {
      onSent(await api.replyInThread(token, text.trim()))
      setText('')
      setSent(true)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="stack" noValidate aria-labelledby="reply-h">
      <h2 id="reply-h">Odpowiedz zespołowi ROPS</h2>
      <div className="field">
        <label htmlFor="t-reply">Twoja wiadomość</label>
        <textarea id="t-reply" className="textarea" rows={4} maxLength={4000} value={text}
          onChange={(e) => { setText(e.target.value); setSent(false) }}
          aria-invalid={error ? true : undefined} aria-describedby="t-reply-hint t-reply-error" />
        <p id="t-reply-hint" className="hint">Wiadomość przeczyta pracownik ROPS. Nie wpisuj danych wrażliwych.</p>
      </div>
      <p id="t-reply-error" className="field-error" role="alert">{error}</p>
      {sent && <p className="status-ok" role="status">Wiadomość wysłana.</p>}
      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Wysyłanie…' : 'Wyślij wiadomość'}</button>
      </div>
    </form>
  )
}

/** Publiczny widok rozmowy: autor zgłoszenia widzi swoje zgłoszenie, odpowiedź ROPS i może odpisać. */
export default function ThreadPage() {
  const { token = '' } = useParams()
  useDocumentTitle('Twoje zgłoszenie · Splot')
  const { data, error, loading, reload, setData } = useLoad(() => api.publicThread(token), [token])

  return (
    <div className="container page">
      <h1>Twoje zgłoszenie</h1>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <p>
            {data.status === 'odpowiedziane'
              ? 'Zespół ROPS odpowiedział na zgłoszenie.'
              : 'Zgłoszenie czeka na odpowiedź zespołu ROPS. Wróć na tę stronę później.'}
          </p>
          <ol className="thread">
            {data.wiadomosci.map((m, i) => (
              <li key={i} className={m.autor_rola === 'admin' ? 'msg-admin' : 'msg-author'}>
                <p className="hint">{m.autor_rola === 'admin' ? 'Wiadomość ROPS' : i === 0 ? 'Twoje zgłoszenie' : 'Twoja wiadomość'} · {formatDate(m.created_at)}</p>
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
          <ReplyForm token={token} onSent={setData} />
        </>
      )}
    </div>
  )
}
