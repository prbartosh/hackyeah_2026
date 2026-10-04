import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/admin/api'
import { Empty, ErrorBox, Loading, errorText, formatDate, useLoad, useTitle } from '@/admin/ui'

const STATUS: Record<string, string> = { szkic: 'Do przeglądu', zatwierdzony: 'Zatwierdzony', odrzucony: 'Odrzucony' }

export default function ImportsPage() {
  useTitle('Wgraj dokument projektu')
  const navigate = useNavigate()
  const { data, error, loading, reload } = useLoad(() => api.imports(), [])
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')

  async function upload(e: FormEvent) {
    e.preventDefault()
    const file = input.current?.files?.[0]
    if (!file) {
      setFailure('Wybierz plik PDF lub DOCX.')
      return
    }
    setBusy(true)
    setFailure('')
    try {
      const created = await api.uploadDocument(file)
      navigate(`/admin/importy/${created.id}`)
    } catch (err) {
      setFailure(errorText(err))
      setBusy(false)
    }
  }

  return (
    <>
      <h1>Wgraj dokument projektu</h1>
      <p className="lead">
        Z dokumentu (PDF lub DOCX) przygotujemy szkic karty innowacji. Zobaczysz go obok fragmentów dokumentu
        i zdecydujesz, czy go opublikować. Pola, których nie ma w dokumencie, zostają puste.
      </p>

      <form onSubmit={upload} className="panel stack" data-tour="panel-import-formularz" noValidate>
        <div className="field">
          <label htmlFor="doc-file">Plik dokumentu (PDF lub DOCX)</label>
          <input id="doc-file" ref={input} className="input" type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            aria-describedby={failure ? 'upload-error' : undefined} />
        </div>
        {failure && <p id="upload-error" className="field-error" role="alert">{failure}</p>}
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Analizowanie dokumentu…' : 'Wgraj i przygotuj szkic karty'}
          </button>
        </div>
        {busy && <p role="status" className="hint">Czytam dokument. To może potrwać kilkanaście sekund.</p>}
      </form>

      <h2>Wcześniejsze dokumenty</h2>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && data.items.length === 0 && <Empty>Nie wgrano jeszcze żadnego dokumentu.</Empty>}
      {data && data.items.length > 0 && (
        <ul className="plain-list">
          {data.items.map((i) => (
            <li key={i.id}>
              <Link to={`/admin/importy/${i.id}`}>{i.nazwa_pliku}</Link> — {STATUS[i.status]}, {formatDate(i.created_at)}
              {i.karta_slug && <> · <Link to={`/admin/karty/${i.karta_slug}`}>karta</Link></>}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
