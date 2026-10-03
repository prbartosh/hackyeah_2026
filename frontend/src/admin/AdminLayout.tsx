import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
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
      <p>Ten panel jest tylko dla pracowników ROPS. Wpisz token dostępu otrzymany od administratora systemu.</p>
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
          <button className="btn btn-primary" type="submit" disabled={busy || !value.trim()}>
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
        <nav aria-label="Panel pracownika" className="admin-nav">
          <NavLink to="/admin" end>Skrzynka zgłoszeń</NavLink>
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
        <button
          type="button" className="btn btn-ghost"
          onClick={() => { setToken(null); setLoggedIn(false) }}
        >
          Wyloguj
        </button>
      </div>
      <Outlet />
    </div>
  )
}
