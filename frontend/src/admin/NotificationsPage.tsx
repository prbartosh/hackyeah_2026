import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/admin/api'
import { Empty, ErrorBox, StatusLine, errorText, formatDate, useLoad, useTitle } from '@/admin/ui'
import { ListSkeleton } from '@/components/Skeleton'

export default function NotificationsPage() {
  useTitle('Powiadomienia')
  const { data, error, loading, reload } = useLoad(() => api.notifications(false), [])
  const [failure, setFailure] = useState('')
  const [message, setMessage] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)

  async function markRead(ids: number[] | null) {
    setFailure('')
    setMessage('')
    try {
      await api.markRead(ids)
      window.dispatchEvent(new Event('admin-notifications-changed'))
      if (ids === null) {
        // Przycisk znika razem z nieprzeczytanymi: fokus wraca na nagłówek, wynik ogłasza komunikat.
        setMessage('Wszystkie powiadomienia oznaczono jako przeczytane.')
        heading.current?.focus()
      }
      reload()
    } catch (e) {
      setFailure(errorText(e))
    }
  }

  return (
    <>
      <h1 ref={heading} tabIndex={-1}>Powiadomienia</h1>
      <p className="lead">Nowe zgłoszenia i oceny do sprawdzenia. Otwarcie zgłoszenia z listy oznacza powiadomienie jako przeczytane.</p>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <ListSkeleton label="Wczytywanie powiadomień…" count={3} />}
      {data && data.items.length === 0 && <Empty>Brak powiadomień.</Empty>}
      {data && data.items.length > 0 && (
        <div className="admin-toolbar">
          <p>Nieprzeczytane: <strong>{data.nieprzeczytane}</strong></p>
          {data.nieprzeczytane > 0 && (
            <button type="button" className="btn btn-secondary" onClick={() => markRead(null)}>
              Oznacz wszystkie jako przeczytane
            </button>
          )}
        </div>
      )}
      <StatusLine message={message} error={failure} />
      {data && data.items.length > 0 && (
        <ul className="notification-list">
          {data.items.map((n) => (
            <li key={n.id} className={n.przeczytane ? '' : 'is-unread'}>
              {!n.przeczytane && <><span className="tag tag-new">Nowe</span>{' '}</>}
              {n.zgloszenie_id
                ? <Link to={`/admin/zgloszenia/${n.zgloszenie_id}`} onClick={() => markRead([n.id])}>{n.tekst}</Link>
                : n.tekst}
              <span className="hint block">{formatDate(n.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
