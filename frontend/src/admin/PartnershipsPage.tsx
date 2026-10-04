import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SEKTORY, TYPY, partnerships, type StatusOgloszenia } from '@/api/partnerships'
import { Empty, ErrorBox, Loading, Pagination, SyntheticTag, errorText, formatDate, useLoad, useTitle } from '@/admin/ui'
import PartnershipConversations from '@/admin/PartnershipConversations'

const LIMIT = 25

const STATUS_LABELS: Record<StatusOgloszenia, string> = {
  oczekuje: 'Do sprawdzenia',
  opublikowane: 'Opublikowane',
  odrzucone: 'Odrzucone',
}

/** Moderacja Giełdy partnerstw: publicznie widać tylko ogłoszenia opublikowane tutaj. */
export default function PartnershipsPage() {
  useTitle('Giełda partnerstw')
  const [status, setStatus] = useState<StatusOgloszenia | ''>('oczekuje')
  const [offset, setOffset] = useState(0)
  const { data, error, loading, reload } = useLoad(() => partnerships.adminList(status, offset), [status, offset])
  const [failure, setFailure] = useState('')
  const [done, setDone] = useState('')

  async function change(id: number, title: string, next: 'opublikowane' | 'odrzucone') {
    setFailure('')
    setDone('')
    try {
      await partnerships.setStatus(id, next)
      setDone(`${next === 'opublikowane' ? 'Opublikowano' : 'Odrzucono'} ogłoszenie „${title}”.`)
      reload()
    } catch (e) {
      setFailure(errorText(e))
    }
  }

  return (
    <>
      <h1>Giełda partnerstw</h1>
      <p className="lead">
        Ogłoszenia instytucji szukających partnerów lub oferujących wsparcie. Po publikacji są widoczne na stronie
        partnerstw. Adres e-mail autora widzisz tylko tutaj; wiadomości do autora trafiają do powiadomień.
      </p>
      <div className="filters">
        <div className="field">
          <label htmlFor="pa-status">Pokaż</label>
          <select id="pa-status" className="select" value={status}
            onChange={(e) => { setStatus(e.target.value as StatusOgloszenia | ''); setOffset(0) }}>
            <option value="oczekuje">Do sprawdzenia</option>
            <option value="opublikowane">Opublikowane</option>
            <option value="odrzucone">Odrzucone</option>
            <option value="">Wszystkie</option>
          </select>
        </div>
      </div>
      <p role="status" className="hint">{done}</p>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {failure && <ErrorBox message={failure} />}
      {loading && !data && <Loading />}
      {data && data.items.length === 0 && <Empty>Brak ogłoszeń w tym widoku.</Empty>}
      {data && data.items.length > 0 && (
        <ul className="plain-list">
          {data.items.map((o) => (
            <li key={o.id} className="panel">
              <p className="meta-line">
                <span className="tag">{TYPY[o.typ]}</span>
                <span className="tag">{SEKTORY[o.sektor]}</span>
                <span className={`tag${o.status === 'oczekuje' ? ' tag-new' : ''}`}>{STATUS_LABELS[o.status]}</span>
                {o.syntetyczne && <SyntheticTag />}
                <span className="hint">{formatDate(o.created_at)}</span>
              </p>
              <h2>{o.tytul}</h2>
              <p><strong>{o.instytucja}</strong>, powiat {o.powiat}</p>
              <p>{o.opis}</p>
              <p className="hint">
                Kontakt: {o.kontakt_email}
                {o.innowacja_slug && <> · Innowacja: <Link to={`/innowacja/${o.innowacja_slug}`}>{o.innowacja_slug}</Link></>}
              </p>
              <div className="btn-row">
                {o.status !== 'opublikowane' && (
                  <button type="button" className="btn btn-primary" onClick={() => change(o.id, o.tytul, 'opublikowane')}>Opublikuj</button>
                )}
                {o.status !== 'odrzucone' && (
                  <button type="button" className="btn btn-secondary" onClick={() => change(o.id, o.tytul, 'odrzucone')}>Odrzuć</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination offset={offset} limit={LIMIT} total={data.total} onChange={setOffset} />}
      <PartnershipConversations />
    </>
  )
}
