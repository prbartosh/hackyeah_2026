import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link to="/" className="brand" aria-label="Splot — strona główna">
          <svg className="brand-mark" viewBox="0 0 40 40" width="44" height="44" aria-hidden="true">
            <rect width="40" height="40" fill="currentColor" />
            <path d="M8 14c8 0 8 12 16 12s8-12 8-12M8 26c8 0 8-12 16-12s8 12 8 12" fill="none" stroke="var(--on-primary)" strokeWidth="3.5" strokeLinecap="square" />
          </svg>
          <span className="brand-text">
            <span className="brand-name">Splot</span>
            <span className="brand-tagline">Wyszukiwarka innowacji społecznych</span>
          </span>
        </Link>
      </div>
    </header>
  )
}
