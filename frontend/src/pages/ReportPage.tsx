import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '@/admin/api'
import { errorText } from '@/admin/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import '@/styles/admin.css'

/** Publiczny formularz: zgłoszenie potrzeby do zespołu ROPS (bez konta). */
export default function ReportPage() {
  useDocumentTitle('Zgłoś potrzebę · Splot')
  // Z wyników czatu przychodzi gotowy opis problemu, żeby nie pisać go drugi raz
  const prefill = (useLocation().state as { tresc?: string } | null)?.tresc ?? ''
  const [text, setText] = useState(prefill)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  // Z czatu bez dopasowania: domyślnie obserwuj, bo rozwiązania jeszcze nie ma w bazie.
  const [watch, setWatch] = useState(Boolean(prefill))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (text.trim().length < 10) {
      setError('Opisz sprawę w kilku zdaniach (co najmniej 10 znaków).')
      return
    }
    setBusy(true)
    setError('')
    try {
      const r = await api.createTicket({
        tresc: text.trim(),
        autor_nazwa: name.trim() || undefined,
        autor_email: email.trim() || undefined,
        obserwuj: watch,
      })
      setToken(r.token_watku)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (token) {
    const link = `/watek/${token}`
    return (
      <div className="container page">
        <h1>Dziękujemy, zgłoszenie dotarło do zespołu ROPS</h1>
        <p role="status">Odpowiedź pojawi się pod tym adresem. Zapisz go lub dodaj do zakładek:</p>
        <p><Link to={link}>{window.location.origin}{link}</Link></p>
        <p className="hint">Jeśli podałeś e-mail, dostaniesz też wiadomość z odpowiedzią.</p>
        {watch && <p className="hint">Gdy ROPS doda do bazy pasujące rozwiązanie, powiadomimy Cię pod tym adresem{email.trim() ? ' i e-mailem' : ''}.</p>}
      </div>
    )
  }

  return (
    <div className="container page report">
      <h1>Nie znalazłeś rozwiązania? Zgłoś potrzebę</h1>
      <p>Opisz swoją sprawę. Pracownik ROPS przeczyta zgłoszenie i odpowie, wskazując rozwiązania z bazy innowacji.</p>
      {prefill && <p className="hint">Wpisaliśmy opis z rozmowy. Możesz go zmienić albo uzupełnić.</p>}
      <form onSubmit={submit} className="stack" noValidate>
        <div className="field">
          <label htmlFor="r-text">Opis sprawy</label>
          <textarea id="r-text" className="textarea" rows={7} value={text} onChange={(e) => setText(e.target.value)}
            maxLength={4000} required aria-invalid={error ? true : undefined} aria-describedby="r-hint r-error" />
          <p id="r-hint" className="hint">Nie wpisuj numerów dokumentów ani danych wrażliwych.</p>
        </div>
        <div className="field">
          <label htmlFor="r-name">Imię (nieobowiązkowo)</label>
          <input id="r-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoComplete="given-name" />
        </div>
        <div className="field">
          <label htmlFor="r-email">E-mail (nieobowiązkowo)</label>
          <input id="r-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-describedby="r-email-hint" />
          <p id="r-email-hint" className="hint">Podaj, jeśli chcesz dostać odpowiedź e-mailem. Bez e-maila odpowiedź zobaczysz pod linkiem po wysłaniu.</p>
        </div>
        <label className="check">
          <input type="checkbox" checked={watch} onChange={(e) => setWatch(e.target.checked)} aria-describedby="r-watch-hint" />
          Powiadom mnie, gdy w bazie pojawi się pasujące rozwiązanie
        </label>
        <p id="r-watch-hint" className="hint">Powiadomienie pojawi się pod linkiem do rozmowy, a jeśli podasz e-mail, także w skrzynce.</p>
        <p id="r-error" className="field-error" role="alert">{error}</p>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Wysyłanie…' : 'Wyślij zgłoszenie'}</button>
        </div>
      </form>
    </div>
  )
}
