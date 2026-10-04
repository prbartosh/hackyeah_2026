import { Compass, Timer } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import AccessibilityBar from '@/components/AccessibilityBar'
import { useTour } from '@/tour/engine/tourReact'

// Strony modułu „Współpraca”: link w nawigacji ma być aktywny na każdej z nich
const COOPERATION_PATHS = ['/wspolpraca', '/partnerstwa', '/pytania', '/mentorzy', '/watek', '/rozmowa']

export default function Header() {
  const { pathname } = useLocation()
  const { openMenu, startChapter } = useTour()
  const coopActive = COOPERATION_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  return (
    <header className="topbar">
      <a href="#main-content" className="skip-link">
        Przejdź do głównej treści
      </a>
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="Splot — strona główna" data-tour="logo">
          <svg className="brand-mark" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
            <rect width="40" height="40" fill="currentColor" />
            <path d="M8 14c8 0 8 12 16 12s8-12 8-12M8 26c8 0 8-12 16-12s8 12 8 12" fill="none" stroke="var(--on-primary)" strokeWidth="3.5" strokeLinecap="square" />
          </svg>
          <span className="brand-text">
            <span className="brand-name">Splot</span>
            <span className="brand-tagline">Wyszukiwarka innowacji społecznych</span>
          </span>
        </Link>
        <nav aria-label="Główna" className="site-nav">
          <NavLink to="/" end data-tour="nav-wyszukiwarka">Wyszukiwarka</NavLink>
          <NavLink to="/zasobnik" data-tour="nav-zasobnik">Zasobnik wiedzy</NavLink>
          <NavLink to="/kreator" data-tour="nav-kreator">Kreator pomysłów</NavLink>
          <NavLink to="/zglos" data-tour="nav-zglos">Zgłoś potrzebę</NavLink>
          <Link to="/wspolpraca" aria-current={coopActive ? 'page' : undefined} data-tour="nav-wspolpraca">Współpraca</Link>
        </nav>
        <button type="button" className="a11y-btn tour-launch" onClick={openMenu} data-tour="przewodnik-przycisk">
          <Compass size={18} aria-hidden="true" />
          Przewodnik
        </button>
        <button type="button" className="a11y-btn tour-launch tour-launch-judge" onClick={() => startChapter('sedzia')} data-tour="przewodnik-dla-sedziego">
          <Timer size={18} aria-hidden="true" />
          Dla sędziego (2 min)
        </button>
        <AccessibilityBar />
      </div>
    </header>
  )
}
