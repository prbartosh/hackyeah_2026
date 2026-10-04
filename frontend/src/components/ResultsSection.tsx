import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Send } from 'lucide-react'
import CompareToggle from '@/components/CompareToggle'
import { useChat } from '@/context/ChatContext'
import { problemAsText } from '@/lib/problem'
import type { ResultItem } from '@/types/chat'
import { kategoriaNazwa } from '@/types/innowacja'

function licenseLabel(licencja: string | null): string {
  if (!licencja) return 'Zasady MIIS'
  return /by\/4\.0/i.test(licencja) ? 'CC BY 4.0' : 'Licencja: zob. źródło'
}

function ResultCard({ item, first }: { item: ResultItem; first: boolean }) {
  const detailsPath = `/innowacja/${item.slug}`
  const kategoria = kategoriaNazwa(item.kategorie)
  const isMain = item.match === 'main'
  const links = [
    item.materialy_url && { label: 'Materiały (ZIP)', href: item.materialy_url, external: false },
    item.pdf_url && { label: 'Folder (PDF)', href: item.pdf_url, external: true },
    item.youtube_url && { label: 'Film', href: item.youtube_url, external: true },
  ].filter((l): l is { label: string; href: string; external: boolean } => !!l)
  // data-tour tylko na pierwszej karcie: przewodnik pokazuje jedną, typową kartę
  const tour = (name: string) => (first ? name : undefined)
  return (
    <li className={`result-card${isMain ? ' is-main' : ''}`} data-tour={tour('czat-wynik')}>
      <p className="result-kinds">
        <span className="result-kind">{isMain ? 'Najlepsze dopasowanie' : 'Uzupełniające'}</span>
        {item.wybrana_do_upowszechniania && <span className="result-kind result-kind-rops">Polecana przez ROPS</span>}
      </p>
      <h3>
        <Link to={detailsPath} data-tour={tour('czat-wynik-link')}>{item.nazwa}</Link>
      </h3>
      <p className="result-meta">
        {kategoria && <span>{kategoria}</span>}
        {item.organizacja && <span>{item.organizacja}</span>}
        <span>{licenseLabel(item.licencja)}</span>
      </p>
      <p data-tour={tour('czat-dlaczego')}>{item.why_relevant}</p>
      {links.length > 0 && (
        <p className="result-files">
          {links.map((l, i) => (
            <span key={l.label}>
              {i > 0 && ' · '}
              <a href={l.href} {...(l.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
                {l.label}
                {l.external && <span className="visually-hidden"> (nowa karta)</span>}
              </a>
            </span>
          ))}
        </p>
      )}
      <div className="btn-row" data-tour={tour('czat-wynik-akcje')}>
        <Link to={detailsPath} className="btn btn-primary">
          Szczegóły i kontakt<span className="visually-hidden">: {item.nazwa}</span>
        </Link>
        <a href={item.url_zrodlowy} className="btn btn-secondary" target="_blank" rel="noreferrer">
          Strona ROPS
          <ExternalLink size={16} aria-hidden="true" />
          <span className="visually-hidden">(otwiera się w nowej karcie)</span>
        </a>
        <CompareToggle slug={item.slug} nazwa={item.nazwa} />
      </div>
    </li>
  )
}

function ReportBox({ noMatch }: { noMatch: boolean }) {
  const { state } = useChat()
  return (
    <div className={`report-box${noMatch ? ' is-strong' : ''}`} data-tour="czat-zglos">
      {noMatch ? (
        <p>
          <strong>Nie mamy jeszcze takiego rozwiązania.</strong> Zapisaliśmy anonimowo, że ta potrzeba
          nie ma odpowiedzi w bazie. Opisz ją pracownikowi ROPS, a odpowie Ci i poszuka rozwiązania.
        </p>
      ) : (
        <p>Żadne rozwiązanie nie pasuje? Zapytaj pracownika ROPS.</p>
      )}
      <Link to="/zglos" state={{ tresc: problemAsText(state) }} className={`btn ${noMatch ? 'btn-primary' : 'btn-secondary'}`}>
        <Send size={18} aria-hidden="true" /> Zgłoś potrzebę do ROPS
      </Link>
    </div>
  )
}

export default function ResultsSection() {
  const { results, podobne } = useChat()
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
    el.scrollIntoView({ behavior: initial || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }, [results])

  if (!results) return null
  const { items, no_good_match, note } = results

  return (
    <section id="wyniki" className="results" data-tour="czat-wyniki" aria-labelledby="results-title">
      <h2 id="results-title" ref={headingRef} tabIndex={-1}>
        {no_good_match ? 'Najbliższe rozwiązania' : 'Znalezione rozwiązania'} ({items.length})
      </h2>

      {no_good_match && (
        <div className="alert alert-warning">
          <p>
            <strong>Brak dokładnego dopasowania.</strong>
            {items.length > 0 && ' Oto najbliższe pozycje.'}
          </p>
          {note && <p className="alert-note">{note}</p>}
        </div>
      )}

      {items.length > 0 && (
        <ol className="result-list">
          {items.map((item, i) => (
            <ResultCard key={item.slug} item={item} first={i === 0} />
          ))}
        </ol>
      )}

      {podobne && (
        <aside className="similar-cases" data-tour="czat-podobne" aria-labelledby="similar-cases-title">
          <h3 id="similar-cases-title">Podobne przypadki</h3>
          <p>
            Podobną potrzebę (problem: {podobne.problem}) zgłoszono już {podobne.liczba} razy. Pokazujemy
            tylko liczby, bez treści rozmów.
          </p>
          {podobne.innowacje.length > 0 && (
            <>
              <p>Najczęściej polecane w takich przypadkach:</p>
              <ul>
                {podobne.innowacje.map((i) => (
                  <li key={i.slug}>
                    <Link to={`/innowacja/${i.slug}`}>{i.nazwa}</Link> ({i.liczba} {i.liczba === 1 ? 'raz' : 'razy'})
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      )}

      <ReportBox noMatch={no_good_match || items.length === 0} />
    </section>
  )
}
