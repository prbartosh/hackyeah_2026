import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/admin/api'
import { Empty, ErrorBox, Loading, errorText, formatDate, useLoad, useTitle } from '@/admin/ui'

export default function NotificationsPage() {
  useTitle('Powiadomienia')
  const { data, error, loading, reload } = useLoad(() => api.notifications(false), [])
  const [failure, setFailure] = useState('')

  async function markRead(ids: number[] | null) {
    setFailure('')
    try {
      await api.markRead(ids)
      window.dispatchEvent(new Event('admin-notifications-changed'))
      reload()
    } catch (e) {
      setFailure(errorText(e))
    }
  }

  return (
    <>
      <h1 data-tour="panel-powiadomienia">Powiadomienia</h1>
      <p className="lead">
        {data ? `Nieprzeczytane: ${data.nieprzeczytane}.` : 'Informacje o nowych zgłoszeniach.'}
      </p>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {failure && <ErrorBox message={failure} />}
      {loading && !data && <Loading />}
      {data && data.items.length === 0 && <Empty>Brak powiadomień.</Empty>}
      {data && data.items.length > 0 && (
        <>
          {data.nieprzeczytane > 0 && (
            <div className="btn-row">
              <button type="button" className="btn btn-secondary" onClick={() => markRead(null)}>
                Oznacz wszystkie jako przeczytane
              </button>
            </div>
          )}
          <ul className="notification-list">
            {data.items.map((n) => (
              <li key={n.id} className={n.przeczytane ? '' : 'is-unread'}>
                <div>
                  {!n.przeczytane && <span className="tag tag-new">Nowe</span>}{' '}
                  {n.zgloszenie_id
                    ? <Link to={`/admin/zgloszenia/${n.zgloszenie_id}`} onClick={() => markRead([n.id])}>{n.tekst}</Link>
                    : n.tekst}
                  <span className="hint block">{formatDate(n.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
