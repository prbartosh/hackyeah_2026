import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { errorText, ErrorBox, Loading, formatDate, useLoad } from '@/admin/ui'
import { partnerships, type StronaRozmowy } from '@/api/partnerships'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { saveRozmowa } from '@/lib/rozmowy'
import '@/styles/admin.css'

/** Rozmowa partnerska widziana ze strony tokenu (ADR 0013): bez adresów e-mail żadnej ze stron. */
export default function ConversationPage() {
  const { token = '' } = useParams()
  useDocumentTitle('Rozmowa partnerska · Splot')
  const { data, error, loading, reload, setData } = useLoad(() => partnerships.conversation(token), [token])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState('')

  // Wejście z linku z e-maila też zapamiętuje rozmowę w tej przeglądarce.
  useEffect(() => {
    if (data) saveRozmowa({ token, tytul: data.tytul, data: new Date().toISOString() })
  }, [data, token])

  function label(strona: StronaRozmowy) {
    if (strona === 'rops') return 'ROPS'
    return strona === data?.twoja_strona ? 'Ty' : data?.druga_strona ?? ''
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFailure('')
    setNotice('')
    if (text.trim().length < 2) {
      setFailure('Napisz co najmniej 2 znaki.')
      return
    }
    setBusy(true)
    try {
      setData(await partnerships.reply(token, text.trim()))
      setText('')
      setNotice('Wiadomość wysłana. Druga strona dostała powiadomienie e-mail.')
    } catch (err) {
      setFailure(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied('Link skopiowany.')
    } catch {
      setCopied('Nie udało się skopiować. Skopiuj adres z paska przeglądarki.')
    }
  }

  return (
    <div className="container page">
      <h1>Rozmowa partnerska</h1>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <p className="lead">
            Ogłoszenie: <strong>{data.tytul}</strong>. Rozmawiasz z: {data.druga_strona}, przez ROPS Kraków.
          </p>
          <p className="hint">
            Twój adres e-mail nie jest widoczny dla drugiej strony. Zachowaj ten link: to Twój dostęp do rozmowy.{' '}
            <button type="button" className="btn-link" onClick={copyLink}>Skopiuj link</button>
          </p>
          <p role="status" className="hint">{copied}</p>
          <ol className="thread chat" aria-label="Wiadomości w rozmowie">
            {data.wiadomosci.map((m, i) => (
              <li key={i} className={`bubble bubble-${m.strona === data.twoja_strona ? 'me' : m.strona === 'rops' ? 'rops' : 'other'}`}>
                <p className="hint"><strong>{label(m.strona)}</strong> · {formatDate(m.created_at)}</p>
                <p className="pre">{m.tresc}</p>
              </li>
            ))}
          </ol>
          {data.status === 'zamknieta' ? (
            <p className="alert alert-note">Ta rozmowa została zamknięta przez ROPS. Możesz ją tylko czytać.</p>
          ) : (
            <form onSubmit={submit} noValidate aria-label="Odpowiedz w rozmowie">
              <div className="field">
                <label htmlFor="rozmowa-tresc">Twoja wiadomość</label>
                <textarea id="rozmowa-tresc" className="textarea" rows={4} maxLength={2000} value={text}
                  aria-invalid={failure ? true : undefined} aria-describedby={failure ? 'rozmowa-error' : undefined}
                  onChange={(e) => setText(e.target.value)} />
                {failure && <p id="rozmowa-error" className="field-error" role="alert">{failure}</p>}
              </div>
              <div className="btn-row">
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Wysyłanie…' : 'Wyślij'}</button>
              </div>
            </form>
          )}
          <p role="status" className="hint">{notice}</p>
          <p><Link to="/partnerstwa">Wróć do Giełdy partnerstw</Link></p>
        </>
      )}
    </div>
  )
}
