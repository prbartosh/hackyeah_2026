import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/admin/api'
import { Empty, ErrorBox, TableSkeleton, errorText, formatDate, useLoad, useTitle } from '@/admin/ui'

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
    if (busy) return
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
        Z dokumentu PDF lub DOCX powstaje szkic karty innowacji. Każde pole widać obok fragmentu dokumentu,
        z którego pochodzi. Kartę publikujesz dopiero po sprawdzeniu. Pól, których nie ma w dokumencie, nie wypełniamy.
      </p>

      <form onSubmit={upload} className="panel stack" noValidate>
        <div className="field">
          <label htmlFor="doc-file">Plik dokumentu (PDF lub DOCX)</label>
          <input id="doc-file" ref={input} className="input" type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            aria-describedby={failure ? 'upload-error' : undefined} />
        </div>
        {failure && <p id="upload-error" className="field-error" role="alert">{failure}</p>}
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" aria-disabled={busy || undefined}>
            {busy ? 'Analizowanie dokumentu…' : 'Wgraj i przygotuj szkic karty'}
          </button>
        </div>
        <p role="status" className="hint status-line">{busy ? 'Trwa czytanie dokumentu. To może potrwać kilkanaście sekund.' : ''}</p>
      </form>

      <h2>Wcześniejsze dokumenty</h2>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <TableSkeleton label="Wczytywanie dokumentów…" rows={3} />}
      {data && data.items.length === 0 && <Empty>Nie wgrano jeszcze żadnego dokumentu.</Empty>}
      {data && data.items.length > 0 && (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabela dokumentów">
          <table className="admin-table">
            <caption className="visually-hidden">Wgrane dokumenty, {data.items.length} łącznie</caption>
            <thead>
              <tr>
                <th scope="col">Plik</th>
                <th scope="col">Stan</th>
                <th scope="col">Wgrano</th>
                <th scope="col">Karta</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.id}>
                  <th scope="row" className="cell-main"><Link to={`/admin/importy/${i.id}`}>{i.nazwa_pliku}</Link></th>
                  <td><span className={`tag${i.status === 'szkic' ? ' tag-new' : ''}`}>{STATUS[i.status]}</span></td>
                  <td>{formatDate(i.created_at)}</td>
                  <td>{i.karta_slug ? <Link to={`/admin/karty/${i.karta_slug}`}>Otwórz kartę</Link> : <span className="hint">Brak</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
