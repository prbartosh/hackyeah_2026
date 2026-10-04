import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { ErrorBox, Loading, errorText, formatDate, useLoad } from '@/admin/ui'
import { mentors } from '@/api/mentors'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import '@/styles/admin.css'

const ROLE: Record<string, string> = {
  uzytkownik: 'Autor zgłoszenia',
  admin: 'ROPS',
  mentor: 'Mentor',
  system: 'Informacja',
}

/** Strona mentora bez konta: dostęp wyłącznie linkiem z tokenem, tylko do przypisanej sprawy. */
export default function MentorThreadPage() {
  const { mentorToken = '', threadToken = '' } = useParams()
  useDocumentTitle('Sprawa dla mentora · Splot')
  const { data, error, loading, reload, setData } = useLoad(
    () => mentors.thread(mentorToken, threadToken), [mentorToken, threadToken],
  )
  const [text, setText] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSent(false)
    if (text.trim().length < 2) {
      setFieldError('Napisz odpowiedź.')
      return
    }
    setFieldError('')
    setBusy(true)
    try {
      setData(await mentors.reply(mentorToken, threadToken, text.trim()))
      setText('')
      setSent(true)
    } catch (err) {
      setFieldError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container page">
      <h1>Sprawa dla mentora</h1>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <p>
            Dzień dobry, {data.mentor_nazwa}. ROPS Kraków przydzielił Cię do tej sprawy. Twoja odpowiedź trafi do autora
            zgłoszenia i pracowników ROPS. Nie udostępniaj tego linku innym osobom.
          </p>
          <ol className="thread">
            {data.wiadomosci.map((m, i) => (
              <li key={i} className={m.autor_rola === 'uzytkownik' ? 'msg-author' : 'msg-admin'}>
                <p className="hint">{ROLE[m.autor_rola] ?? m.autor_rola} · {formatDate(m.created_at)}</p>
                <p className="pre">{m.tresc}</p>
              </li>
            ))}
          </ol>
          <form className="panel" onSubmit={submit} noValidate aria-labelledby="mentor-reply-h">
            <h2 id="mentor-reply-h">Twoja odpowiedź</h2>
            <div className="field">
              <label htmlFor="mentor-reply">Wiadomość</label>
              <textarea id="mentor-reply" className="textarea" rows={6} maxLength={4000} value={text}
                aria-invalid={fieldError ? true : undefined} aria-describedby={fieldError ? 'mentor-reply-error' : undefined}
                onChange={(e) => setText(e.target.value)} />
              {fieldError && <p id="mentor-reply-error" className="field-error" role="alert">{fieldError}</p>}
            </div>
            <p role="status" className={sent ? 'alert alert-note' : undefined}>{sent ? 'Odpowiedź została wysłana.' : ''}</p>
            <div className="btn-row">
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Wysyłanie…' : 'Wyślij odpowiedź'}</button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
