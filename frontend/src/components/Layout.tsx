import { Suspense, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import Header from '@/components/Header'

export default function Layout() {
  const { pathname } = useLocation()

  // Przy zmianie podstrony zacznij od góry (powrót do /#wyniki obsługuje sekcja wyników)
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <Header />
      <main id="main-content" tabIndex={-1}>
        <ErrorBoundary resetKey={pathname} label="ta strona">
          <Suspense fallback={<p className="route-loading" role="status">Ładowanie strony…</p>}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="site-footer">
        <div className="wide footer-inner">
          <strong>Splot</strong> · Dane: <a href="https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie">Biblioteka Innowacji Społecznych ROPS Kraków</a> (CC BY 4.0) · <a href="mailto:iws@rops.krakow.pl">iws@rops.krakow.pl</a> · <Link to="/zglos">Zgłoś potrzebę</Link> · <Link to="/kreator">Kreator pomysłów</Link> · <Link to="/admin">Panel pracownika</Link>
        </div>
      </footer>
    </div>
  )
}
