import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '@/admin/api'
import { errorText } from '@/admin/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { saveThread } from '@/lib/myThreads'
import { looksLikePesel, MAX_TEXT, validateReport, type ReportErrors } from '@/lib/reportValidation'
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
  const [errors, setErrors] = useState<ReportErrors>({})
  const textRef = useRef<HTMLTextAreaElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const found = validateReport(text, email)
    setErrors(found)
    if (found.text || found.email) {
      setError('')
      ;(found.text ? textRef : emailRef).current?.focus()
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
      saveThread(r.token_watku, text)
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
        <p><Link to={link} data-tour="wspolpraca-link-watku">{window.location.origin}{link}</Link></p>
        <p className="hint">Jeśli podałeś e-mail, dostaniesz też wiadomość z odpowiedzią.</p>
        {watch && <p className="hint">Gdy ROPS doda do bazy pasujące rozwiązanie, powiadomimy Cię pod tym adresem{email.trim() ? ' i e-mailem' : ''}.</p>}
        <p><Link to="/wspolpraca">Co dalej? Współpraca z ROPS</Link></p>
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
          <textarea id="r-text" ref={textRef} data-tour="wspolpraca-opis" className="textarea" rows={7} value={text}
            onChange={(e) => { setText(e.target.value); if (errors.text) setErrors({ ...errors, text: undefined }) }}
            maxLength={MAX_TEXT} required aria-invalid={errors.text ? true : undefined} aria-describedby="r-hint r-text-error" />
          <p id="r-hint" className="hint">Nie wpisuj numerów dokumentów ani danych wrażliwych. Znaków: {text.length} z {MAX_TEXT}.</p>
          {looksLikePesel(text) && (
            <p className="hint" role="status">W opisie jest ciąg 11 cyfr, który wygląda jak numer PESEL. Usuń go, nie jest potrzebny do odpowiedzi.</p>
          )}
          <p id="r-text-error" className="field-error" role="alert">{errors.text}</p>
        </div>
        <div className="field">
          <label htmlFor="r-name">Imię (nieobowiązkowo)</label>
          <input id="r-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoComplete="given-name" />
        </div>
        <div className="field">
          <label htmlFor="r-email">E-mail (nieobowiązkowo)</label>
          <input id="r-email" ref={emailRef} data-tour="wspolpraca-email" className="input" type="email" value={email}
            onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }) }}
            autoComplete="email" aria-invalid={errors.email ? true : undefined} aria-describedby="r-email-hint r-email-error" />
          <p id="r-email-hint" className="hint">Podaj, jeśli chcesz dostać odpowiedź e-mailem. Bez e-maila odpowiedź zobaczysz pod linkiem po wysłaniu.</p>
          <p id="r-email-error" className="field-error" role="alert">{errors.email}</p>
        </div>
        <label className="check">
          <input type="checkbox" data-tour="wspolpraca-obserwuj" checked={watch} onChange={(e) => setWatch(e.target.checked)} aria-describedby="r-watch-hint" />
          Powiadom mnie, gdy w bazie pojawi się pasujące rozwiązanie
        </label>
        <p id="r-watch-hint" className="hint">Powiadomienie pojawi się pod linkiem do rozmowy, a jeśli podasz e-mail, także w skrzynce.</p>
        <p id="r-error" className="field-error" role="alert">{error}</p>
        <div className="btn-row">
          <button type="submit" data-tour="wspolpraca-wyslij" className="btn btn-primary" disabled={busy}>{busy ? 'Wysyłanie…' : 'Wyślij zgłoszenie'}</button>
        </div>
      </form>
    </div>
  )
}
