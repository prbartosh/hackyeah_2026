import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { api, getToken, setToken } from '@/admin/api'
import { errorText, useTitle } from '@/admin/ui'
import '@/styles/admin.css'

const UNREAD_POLL_MS = 30000

function Login({ onLogin }: { onLogin: () => void }) {
  useTitle('Logowanie')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setToken(value.trim())
    try {
      await api.notifications(true)
      onLogin()
    } catch (err) {
      setToken(null)
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container page admin-login">
      <h1>Panel pracownika ROPS</h1>
      <p>Panel jest tylko dla pracowników ROPS. Wpisz token dostępu od administratora systemu.</p>
      <form onSubmit={submit} className="stack" noValidate>
        <div className="field">
          <label htmlFor="admin-token">Token dostępu</label>
          <input
            id="admin-token" className="input" type="password" autoComplete="current-password"
            value={value} onChange={(e) => setValue(e.target.value)} required
            aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        {error && <p id="login-error" className="field-error" role="alert">{error}</p>}
        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={!value.trim()} aria-disabled={busy || undefined}>
            {busy ? 'Sprawdzanie…' : 'Zaloguj'}
          </button>
        </div>
      </form>
    </div>
  )
}

/** Właściwa kontrola dostępu jest na backendzie. */
export default function AdminLayout() {
  const [loggedIn, setLoggedIn] = useState(() => getToken() !== null)
  const [unread, setUnread] = useState<number | null>(null)
  const { pathname } = useLocation()
  const inInbox = pathname === '/admin' || pathname === '/admin/' || pathname.startsWith('/admin/zgloszenia/')

  const refreshUnread = useCallback(() => {
    api.notifications(true)
      .then((r) => setUnread(r.nieprzeczytane))
      .catch((e) => {
        if (e?.status === 401) {
          setToken(null)
          setLoggedIn(false)
        }
      })
  }, [])

  useEffect(() => {
    if (!loggedIn) return
    refreshUnread()
    const timer = window.setInterval(refreshUnread, UNREAD_POLL_MS)
    window.addEventListener('admin-notifications-changed', refreshUnread)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('admin-notifications-changed', refreshUnread)
    }
  }, [loggedIn, refreshUnread])

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />

  return (
    <div className="container page admin">
      <div className="admin-bar">
        <p className="admin-title">Panel pracownika ROPS</p>
        <button
          type="button" className="btn btn-link"
          onClick={() => { setToken(null); setLoggedIn(false) }}
        >
          Wyloguj
        </button>
      </div>
      <nav aria-label="Panel pracownika" className="admin-nav">
        {/* Zgłoszenie jest częścią skrzynki: zakładka zostaje zaznaczona także na stronie zgłoszenia. */}
        <Link to="/admin" aria-current={inInbox ? 'page' : undefined}>Skrzynka zgłoszeń</Link>
        <NavLink to="/admin/powiadomienia">
          Powiadomienia
          {unread ? <span className="count" aria-label={`, nieprzeczytane: ${unread}`}>{unread}</span> : null}
        </NavLink>
        <NavLink to="/admin/importy">Wgraj dokument</NavLink>
        <NavLink to="/admin/karty">Karty innowacji</NavLink>
        <NavLink to="/admin/radar">Radar trendów</NavLink>
        <NavLink to="/admin/nabory">Nabory grantowe</NavLink>
        <NavLink to="/admin/opinie">Oceny i testy</NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
