import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { opinions, type StatusOpinii } from '@/api/opinions'
import { Empty, ErrorBox, Loading, Pagination, SyntheticTag, errorText, formatDate, useLoad, useTitle } from '@/admin/ui'

const LIMIT = 25

const STATUS_LABELS: Record<StatusOpinii, string> = {
  nowa: 'Do sprawdzenia',
  opublikowana: 'Opublikowana',
  ukryta: 'Ukryta',
}

/** Moderacja Testera innowacji: publicznie widać tylko opinie opublikowane tutaj. */
export default function OpinionsPage() {
  useTitle('Oceny i testy')
  const [status, setStatus] = useState<StatusOpinii | ''>('nowa')
  const [offset, setOffset] = useState(0)
  const { data, error, loading, reload } = useLoad(() => opinions.adminList(status, offset), [status, offset])
  const [failure, setFailure] = useState('')
  const [done, setDone] = useState('')

  async function change(id: number, next: StatusOpinii) {
    setFailure('')
    setDone('')
    try {
      const r = await opinions.setStatus(id, next)
      setDone(`${next === 'opublikowana' ? 'Opublikowano' : 'Ukryto'} opinię o „${r.nazwa ?? r.slug}”.`)
      reload()
    } catch (e) {
      setFailure(errorText(e))
    }
  }

  return (
    <>
      <h1>Oceny i testy</h1>
      <p className="lead">
        Oceny innowacji i zgłoszenia do testów od instytucji. Po publikacji są widoczne na karcie rozwiązania
        i podnoszą jego poziom dowodu. Zgłoszenia do testów mają też wątek w skrzynce.
      </p>
      <div className="filters">
        <div className="field">
          <label htmlFor="op-status">Pokaż</label>
          <select id="op-status" className="select" value={status}
            onChange={(e) => { setStatus(e.target.value as StatusOpinii | ''); setOffset(0) }}>
            <option value="nowa">Do sprawdzenia</option>
            <option value="opublikowana">Opublikowane</option>
            <option value="ukryta">Ukryte</option>
            <option value="">Wszystkie</option>
          </select>
        </div>
      </div>
      <p role="status" className="hint">{done}</p>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {failure && <ErrorBox message={failure} />}
      {loading && !data && <Loading />}
      {data && data.items.length === 0 && <Empty>Brak opinii w tym widoku.</Empty>}
      {data && data.items.length > 0 && (
        <ul className="plain-list">
          {data.items.map((o) => (
            <li key={o.id} className="panel">
              <p className="meta-line">
                {o.rodzaj === 'test'
                  ? <span className="tag"><FlaskConical size={14} aria-hidden="true" /> Zgłoszenie do testów</span>
                  : <span className="tag">Ocena: {o.ocena} z 5</span>}
                <span className={`tag${o.status === 'nowa' ? ' tag-new' : ''}`}>{STATUS_LABELS[o.status]}</span>
                {o.syntetyczna && <SyntheticTag />}
                <span className="hint">{formatDate(o.created_at)}</span>
              </p>
              <h2><Link to={`/innowacja/${o.slug}`}>{o.nazwa ?? o.slug}</Link></h2>
              <p><strong>{o.instytucja ?? 'Instytucja bez nazwy'}:</strong> {o.tresc}</p>
              {o.usprawnienie && <p><strong>Propozycja usprawnienia:</strong> {o.usprawnienie}</p>}
              <div className="btn-row">
                {o.status !== 'opublikowana' && (
                  <button type="button" className="btn btn-primary" onClick={() => change(o.id, 'opublikowana')}>Opublikuj</button>
                )}
                {o.status !== 'ukryta' && (
                  <button type="button" className="btn btn-secondary" onClick={() => change(o.id, 'ukryta')}>Ukryj</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination offset={offset} limit={LIMIT} total={data.total} onChange={setOffset} />}
    </>
  )
}
