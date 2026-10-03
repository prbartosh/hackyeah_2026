import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Send } from 'lucide-react'
import { useChat } from '@/context/ChatContext'
import { problemAsText } from '@/lib/problem'
import type { ResultItem, Results } from '@/types/chat'
import { kategoriaNazwa } from '@/types/innowacja'

function licenseLabel(licencja: string | null): string {
  if (!licencja) return 'Zasady MIIS'
  return /by\/4\.0/i.test(licencja) ? 'CC BY 4.0' : 'Licencja: zob. źródło'
}

function ResultCard({ item }: { item: ResultItem }) {
  const detailsPath = `/innowacja/${item.slug}`
  const kategoria = kategoriaNazwa(item.kategorie)
  const isMain = item.match === 'main'
  const links = [
    item.materialy_url && { label: 'Materiały (ZIP)', href: item.materialy_url, external: false },
    item.pdf_url && { label: 'Folder (PDF)', href: item.pdf_url, external: true },
    item.youtube_url && { label: 'Film', href: item.youtube_url, external: true },
    { label: 'Strona ROPS', href: item.url_zrodlowy, external: true },
  ].filter((l): l is { label: string; href: string; external: boolean } => !!l)
  return (
    <li className={`result-card${isMain ? ' is-main' : ''}`}>
      <p className="result-kinds">
        <span className="result-kind">{isMain ? 'Najlepsze dopasowanie' : 'Uzupełniające'}</span>
        {item.wybrana_do_upowszechniania && <span className="result-kind result-kind-rops">Polecana przez ROPS</span>}
      </p>
      <h3>
        <Link to={detailsPath}>{item.nazwa}</Link>
      </h3>
      <p className="result-meta">
        {kategoria && <span>{kategoria}</span>}
        {item.organizacja && <span>{item.organizacja}</span>}
        <span>{licenseLabel(item.licencja)}</span>
      </p>
      <p>{item.why_relevant}</p>
      <p className="result-files">
        {links.map((l, i) => (
          <span key={l.label}>
            {i > 0 && ' · '}
            <a href={l.href} {...(l.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
              {l.label}
              {l.external && <span className="visually-hidden"> (otwiera się w nowej karcie)</span>}
            </a>
          </span>
        ))}
      </p>
      <div className="btn-row">
        <Link to={detailsPath} className={`btn ${isMain ? 'btn-primary' : 'btn-secondary'}`}>
          Opis i wdrożenie<span className="visually-hidden">: {item.nazwa}</span>
        </Link>
      </div>
    </li>
  )
}

function ReportBox({ noMatch }: { noMatch: boolean }) {
  const { state } = useChat()
  return (
    <div className={`report-box${noMatch ? ' is-strong' : ''}`}>
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
  const { results, streaming } = useChat()
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Ostatnie wyniki, dla których przenieśliśmy już fokus (undefined = pierwsze wyświetlenie sekcji)
  const handled = useRef<Results | null | undefined>(undefined)

  // Nowe wyniki → fokus na nagłówku (klawiatura i czytniki ekranu), dopiero po końcu tury:
  // wtedy znika wskaźnik pisania i układ nad wynikami już się nie przesunie.
  // Powrót ze strony szczegółów (/#wyniki) → przewiń do wyników.
  useEffect(() => {
    if (streaming || handled.current === results) return
    const initial = handled.current === undefined
    handled.current = results
    const el = headingRef.current
    if (!el || (initial && window.location.hash !== '#wyniki')) return
    el.focus({ preventScroll: true })
    el.scrollIntoView({ behavior: initial || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }, [results, streaming])

  if (!results) return null
  const { items, no_good_match, note } = results

  return (
    <section id="wyniki" className="results" aria-labelledby="results-title">
      <h2 id="results-title" ref={headingRef} tabIndex={-1}>
        {no_good_match ? 'Najbliższe rozwiązania' : 'Znalezione rozwiązania'} ({items.length})
      </h2>
      {items.length > 0 && (
        <p className="lead results-lead">
          Otwórz rozwiązanie, żeby zobaczyć opis, materiały i plan wdrożenia w Twojej instytucji.
        </p>
      )}

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
          {items.map((item) => (
            <ResultCard key={item.slug} item={item} />
          ))}
        </ol>
      )}

      <ReportBox noMatch={no_good_match || items.length === 0} />
    </section>
  )
}
