import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useChat } from '@/context/ChatContext'

export default function ResultsSection() {
  const { results } = useChat()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRun = useRef(true)

  // Nowe wyniki → fokus na nagłówku (klawiatura i czytniki ekranu).
  // Powrót ze strony szczegółów (/#wyniki) → przewiń do wyników.
  useEffect(() => {
    const initial = firstRun.current
    firstRun.current = false
    const el = headingRef.current
    if (!el || (initial && window.location.hash !== '#wyniki')) return
    el.focus({ preventScroll: true })
    el.scrollIntoView({ behavior: initial ? 'auto' : 'smooth', block: 'start' })
  }, [results])

  if (!results) return null
  const { items, no_match } = results

  return (
    <section id="wyniki" className="results" aria-labelledby="results-title">
      <h2 id="results-title" ref={headingRef} tabIndex={-1}>
        {no_match ? 'Najbliższe rozwiązania' : 'Znalezione rozwiązania'} ({items.length})
      </h2>

      {no_match && (
        <div className="alert alert-warning">
          <p>
            <strong>Nie znaleźliśmy rozwiązania, które dokładnie odpowiada Twojemu problemowi.</strong>{' '}
            Pokazujemy pozycje najbardziej zbliżone. Przy każdej opisujemy, czym się różni od Twojej potrzeby.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <ol className="result-list">
          {items.map((item, i) => (
            <li key={item.slug} className="result-card">
              <p className="result-num" aria-hidden="true">{i + 1}</p>
              <div className="result-body">
                <h3>
                  <Link to={`/innowacja/${item.slug}`}>{item.nazwa}</Link>
                </h3>
                <p className="result-meta">
                  {item.kategoria && <span>{item.kategoria}</span>}
                  {item.organizacja && <span>Autor: {item.organizacja}</span>}
                  {item.wybrana_do_upowszechniania && <span className="badge">Polecana przez ROPS do upowszechniania</span>}
                </p>
                <h4>{no_match ? 'Czym się różni' : 'Dlaczego to pasuje'}</h4>
                <p>{no_match && item.difference ? item.difference : item.why_relevant}</p>
                <div className="btn-row">
                  <Link to={`/innowacja/${item.slug}`} className="btn btn-primary">
                    Zobacz szczegóły i kontakt<span className="visually-hidden">: {item.nazwa}</span>
                  </Link>
                  <a href={item.url_zrodlowy} className="btn btn-secondary" target="_blank" rel="noreferrer">
                    Strona w bibliotece ROPS
                    <ExternalLink size={18} aria-hidden="true" />
                    <span className="visually-hidden">(otwiera się w nowej karcie)</span>
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
