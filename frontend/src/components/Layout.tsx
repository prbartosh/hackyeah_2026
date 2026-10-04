import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import CompareBar from '@/components/CompareBar'
import ErrorBoundary from '@/components/ErrorBoundary'
import Header from '@/components/Header'

export default function Layout() {
  const { pathname } = useLocation()

  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)
  const lastTitle = useRef('')
  const [announcement, setAnnouncement] = useState('')

  // Przy zmianie podstrony zacznij od góry (powrót do /#wyniki obsługuje sekcja wyników)
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0)
  }, [pathname])

  // Po zmianie trasy przenieś focus na treść i zapowiedz nowy tytuł (czytnik ekranu inaczej milczy).
  // Pomijamy pierwszy render i nawigację do kotwicy (#wyniki ma własną obsługę focusu).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      lastTitle.current = document.title
      return
    }
    if (window.location.hash) return
    // Granica błędów (np. nieudany chunk) sama przenosi focus na alert, więc go nie zabieramy
    if (!document.activeElement?.closest('.error-boundary')) mainRef.current?.focus({ preventScroll: true })

    // Tytuł ustawia strona, a leniwa strona robi to dopiero po pobraniu chunka, więc czekamy na zmianę <title>
    const titleEl = document.querySelector('title')
    const announce = () => {
      lastTitle.current = document.title
      setAnnouncement(document.title)
    }
    if (document.title !== lastTitle.current) {
      announce()
      return
    }
    const observer = new MutationObserver(() => { announce(); observer.disconnect() })
    if (titleEl) observer.observe(titleEl, { childList: true, characterData: true, subtree: true })
    const fallback = window.setTimeout(announce, 1500)
    return () => {
      observer.disconnect()
      window.clearTimeout(fallback)
    }
  }, [pathname])

  return (
    <div className="app">
      <Header />
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        <ErrorBoundary resetKey={pathname} label="ta strona">
          <Suspense fallback={<p className="route-loading" role="status">Ładowanie strony…</p>}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <p className="visually-hidden" role="status">{announcement}</p>
      <CompareBar />
      <footer className="site-footer">
        <div className="wide footer-inner">
          <strong>Splot</strong> · Dane: <a href="https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie">Biblioteka Innowacji Społecznych ROPS Kraków</a> (CC BY 4.0) · <a href="mailto:iws@rops.krakow.pl">iws@rops.krakow.pl</a> · <Link to="/zglos">Zgłoś potrzebę</Link> · <Link to="/kreator">Kreator pomysłów</Link> · <Link to="/partnerstwa">Giełda partnerstw</Link> · <Link to="/otwarte-dane">Otwarte dane</Link> · <Link to="/dostepnosc">Deklaracja dostępności</Link> · <Link to="/admin">Panel pracownika</Link>
        </div>
      </footer>
    </div>
  )
}
