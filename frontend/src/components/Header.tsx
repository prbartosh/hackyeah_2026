import { Link, NavLink } from 'react-router-dom'
import AccessibilityBar from '@/components/AccessibilityBar'

/** Górny pasek: nazwa serwisu w lewym rogu, ułatwienia dostępu po prawej. */
export default function Header() {
  return (
    <header className="topbar">
      <a href="#main-content" className="skip-link">
        Przejdź do głównej treści
      </a>
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="Splot — strona główna">
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
          <NavLink to="/" end>Wyszukiwarka</NavLink>
          <NavLink to="/zasobnik">Zasobnik wiedzy</NavLink>
        </nav>
        <AccessibilityBar />
      </div>
    </header>
  )
}
