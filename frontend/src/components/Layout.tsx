import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AccessibilityBar from '@/components/AccessibilityBar'
import Header from '@/components/Header'

export default function Layout() {
  const { pathname } = useLocation()

  // Przy zmianie podstrony zacznij od góry (powrót do /#wyniki obsługuje sekcja wyników)
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <AccessibilityBar />
      <Header />
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <p>
            <strong>Splot</strong> — projekt zespołu HackYeah 2026.
          </p>
          <p>
            Dane: <a href="https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie">Biblioteka Innowacji Społecznych ROPS w Krakowie</a>,
            licencja CC BY 4.0. Pytania o bibliotekę: <a href="mailto:iws@rops.krakow.pl">iws@rops.krakow.pl</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
