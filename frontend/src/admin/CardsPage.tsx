import { Link, useSearchParams } from 'react-router-dom'
import { api } from '@/admin/api'
import {
  CardStatusBadge, EVIDENCE_LABELS, Empty, ErrorBox, Loading, Pagination, categoryName, formatDate, useLoad, useTitle,
} from '@/admin/ui'

const LIMIT = 25
const STATUSES = [
  { key: '', label: 'Wszystkie' },
  { key: 'szkic', label: 'Szkice' },
  { key: 'opublikowana', label: 'Opublikowane' },
  { key: 'zarchiwizowana', label: 'Zarchiwizowane' },
]
const SOURCE: Record<string, string> = { rops: 'Baza ROPS', dokument: 'Z dokumentu', panel: 'Dodana w panelu' }

export default function CardsPage() {
  useTitle('Karty innowacji')
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const q = params.get('q') ?? ''
  const offset = Number(params.get('offset') ?? 0)
  const { data, error, loading, reload } = useLoad(
    () => api.cards({ status, q, offset, limit: LIMIT }),
    [status, q, offset],
  )

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('offset' in changes)) next.delete('offset')
    setParams(next, { replace: true })
  }

  return (
    <>
      <h1>Karty innowacji</h1>
      <p className="lead">Karty widoczne dla użytkowników mają status „Opublikowana”. Zmiana treści karty przelicza jej dopasowanie w wyszukiwarce.</p>
      <div className="btn-row">
        <Link className="btn btn-primary" to="/admin/karty/nowa">Dodaj kartę ręcznie</Link>
        <Link className="btn btn-secondary" to="/admin/importy">Wgraj dokument projektu</Link>
      </div>

      <div className="filters" role="group" aria-label="Filtry kart">
        <div className="field">
          <span id="status-label" className="label">Status</span>
          <div className="a11y-options" role="group" aria-labelledby="status-label">
            {STATUSES.map((s) => (
              <button key={s.key} type="button" className="btn btn-option" aria-pressed={status === s.key} onClick={() => update({ status: s.key })}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="card-q">Szukaj po nazwie</label>
          <input id="card-q" className="input" type="search" defaultValue={q} key={q}
            onKeyDown={(e) => { if (e.key === 'Enter') update({ q: e.currentTarget.value.trim() }) }}
            onBlur={(e) => { if (e.currentTarget.value.trim() !== q) update({ q: e.currentTarget.value.trim() }) }} />
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading text="Wczytywanie kart…" />}
      {data && data.items.length === 0 && <Empty>Brak kart dla tych filtrów.</Empty>}
      {data && data.items.length > 0 && (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabela kart">
          <table className="admin-table">
            <caption className="visually-hidden">Karty innowacji, {data.total} łącznie</caption>
            <thead>
              <tr>
                <th scope="col">Nazwa</th>
                <th scope="col">Status</th>
                <th scope="col">Poziom dowodu</th>
                <th scope="col">Pochodzenie</th>
                <th scope="col">Zmieniona</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.slug}>
                  <th scope="row" className="cell-main">
                    <Link to={`/admin/karty/${c.slug}`}>{c.nazwa}</Link>
                    <div className="hint">{categoryName(c.kategorie[0] ?? null)}</div>
                  </th>
                  <td><CardStatusBadge status={c.status} /></td>
                  <td>{c.poziom_dowodu ? EVIDENCE_LABELS[c.poziom_dowodu] : 'Nie określono'}</td>
                  <td>{SOURCE[c.zrodlo] ?? c.zrodlo}</td>
                  <td>{formatDate(c.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination offset={offset} limit={LIMIT} total={data.total} onChange={(o) => update({ offset: String(o) })} />}
    </>
  )
}
