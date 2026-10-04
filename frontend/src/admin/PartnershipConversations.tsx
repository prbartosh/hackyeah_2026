import { useState, type FormEvent } from 'react'
import { partnerships, type RozmowaAdmin } from '@/api/partnerships'
import { Empty, ErrorBox, Loading, Pagination, errorText, formatDate, useLoad } from '@/admin/ui'

const LIMIT = 25
const STRONY = { nadawca: 'Nadawca', autor: 'Autor ogłoszenia', rops: 'ROPS' } as const

/** Podgląd jednej rozmowy: zamknięcie (moderacja nadużyć) i wpis ROPS, który dostają obie strony. */
function Detail({ id, onChanged }: { id: number; onChanged: () => void }) {
  const { data, error, loading, setData } = useLoad(() => partnerships.adminConversation(id), [id])
  const [text, setText] = useState('')
  const [failure, setFailure] = useState('')
  const [done, setDone] = useState('')

  async function run(action: () => Promise<RozmowaAdmin>, message: string) {
    setFailure('')
    setDone('')
    try {
      setData(await action())
      setDone(message)
      onChanged()
      return true
    } catch (e) {
      setFailure(errorText(e))
      return false
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault()
    if (text.trim().length < 2) {
      setFailure('Napisz co najmniej 2 znaki.')
      return
    }
    if (await run(() => partnerships.ropsMessage(id, text.trim()), 'Wpis ROPS wysłany obu stronom.')) setText('')
  }

  if (loading && !data) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!data) return null
  return (
    <div className="panel">
      <h3>{data.tytul}</h3>
      <p className="hint">
        Nadawca: {data.nadawca_nazwa} ({data.nadawca_email}) · Autor: {data.instytucja} ({data.kontakt_email})
      </p>
      <ol className="thread">
        {data.wiadomosci.map((m, i) => (
          <li key={i} className={m.strona === 'rops' ? 'msg-admin' : 'msg-author'}>
            <p className="hint">{STRONY[m.strona]} · {formatDate(m.created_at)}</p>
            <p className="pre">{m.tresc}</p>
          </li>
        ))}
      </ol>
      <p role="status" className="hint">{done}</p>
      {failure && <p className="field-error" role="alert">{failure}</p>}
      {data.status === 'otwarta' ? (
        <form onSubmit={send} noValidate aria-label="Wpis ROPS w rozmowie">
          <div className="field">
            <label htmlFor={`rops-${id}`}>Wpis ROPS (zobaczą go obie strony)</label>
            <textarea id={`rops-${id}`} className="textarea" rows={3} maxLength={2000} value={text}
              onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary">Wyślij wpis</button>
            <button type="button" className="btn btn-secondary"
              onClick={() => run(() => partnerships.closeConversation(id), 'Rozmowa zamknięta: tylko odczyt.')}>
              Zamknij rozmowę
            </button>
          </div>
        </form>
      ) : (
        <p className="hint">Rozmowa jest zamknięta: strony mogą ją tylko czytać.</p>
      )}
    </div>
  )
}

/** Rozmowy partnerskie w panelu: lista z liczbą wiadomości i podgląd. */
export default function PartnershipConversations() {
  const [offset, setOffset] = useState(0)
  const [open, setOpen] = useState<number | null>(null)
  const { data, error, loading, reload } = useLoad(() => partnerships.adminConversations(offset), [offset])

  return (
    <section aria-labelledby="rozmowy-title" data-tour="panel-rozmowy">
      <h2 id="rozmowy-title">Rozmowy partnerskie</h2>
      <p className="lead">
        Korespondencja stron przez ROPS. Strony nie widzą swoich adresów e-mail. Zamknij rozmowę, gdy ktoś nadużywa
        kanału: obie strony zostaną przy samym odczycie.
      </p>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && data.items.length === 0 && <Empty>Brak rozmów.</Empty>}
      {data && data.items.length > 0 && (
        <ul className="plain-list">
          {data.items.map((c) => (
            <li key={c.id} className="panel">
              <p className="meta-line">
                <span className={`tag${c.status === 'otwarta' ? ' tag-new' : ''}`}>{c.status === 'otwarta' ? 'Otwarta' : 'Zamknięta'}</span>
                <span className="tag">Wiadomości: {c.liczba_wiadomosci}</span>
                <span className="hint">Ostatnia aktywność: {formatDate(c.updated_at)}</span>
              </p>
              <p><strong>{c.tytul}</strong>, nadawca: {c.nadawca_nazwa}</p>
              <div className="btn-row">
                <button type="button" className="btn btn-secondary" aria-expanded={open === c.id}
                  onClick={() => setOpen(open === c.id ? null : c.id)}>
                  {open === c.id ? 'Ukryj rozmowę' : 'Pokaż rozmowę'}<span className="visually-hidden">: {c.tytul}</span>
                </button>
              </div>
              {open === c.id && <Detail id={c.id} onChanged={reload} />}
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination offset={offset} limit={LIMIT} total={data.total} onChange={setOffset} />}
    </section>
  )
}
