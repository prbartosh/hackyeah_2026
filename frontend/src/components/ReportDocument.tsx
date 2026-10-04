import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Calendar, Clock, ExternalLink, FileText, Printer, Scale } from 'lucide-react'
import { TYP_NAZWA, type DokumentSzczegoly } from '@/api/documents'
import ReportReader, { ReportSearch } from '@/components/ReportReader'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { plural } from '@/lib/plural'
import { parseReport, readingMinutes } from '@/lib/reportText'

function NewTab() {
  return <span className="visually-hidden"> (otwiera się w nowej karcie)</span>
}

/** Tytuły ROPS zaczynają się od roku i kreski: „2025 | Usługi…”. Rok pokazujemy osobno. */
const cleanTitle = (t: string) => t.replace(/^\d{4}\s*[|\-–]\s*/, '').replace(/\s+/g, ' ').trim()

/** Nagłówki pisane wersalikami skracamy do zwykłej wielkości liter, mieszane zostają jak w dokumencie. */
const tocLabel = (t: string) => (t === t.toLocaleUpperCase('pl-PL') ? t.charAt(0) + t.slice(1).toLocaleLowerCase('pl-PL') : t)

export default function ReportDocument({ doc }: { doc: DokumentSzczegoly }) {
  const report = useMemo(() => parseReport(doc.tresc), [doc.tresc])
  const wide = useMediaQuery('(min-width: 64rem)')
  const [query, setQuery] = useState('')
  const [hit, setHit] = useState(0)
  const [hits, setHits] = useState(0)
  const [active, setActive] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [more, setMore] = useState(false)

  // Zliczanie trafień po wyrenderowaniu (znaczniki <mark>)
  useEffect(() => {
    setHit(0)
    const id = requestAnimationFrame(() => setHits(query.trim().length >= 2 ? document.querySelectorAll('.zs-r-body mark.zs-hit').length : 0))
    return () => cancelAnimationFrame(id)
  }, [query, report])

  // Pasek postępu czytania
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Podświetlenie bieżącego rozdziału w spisie treści
  useEffect(() => {
    const els = report.headings.map((h) => document.getElementById(h.id)).filter((e): e is HTMLElement => !!e)
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
    }, { rootMargin: '-15% 0px -75% 0px' })
    els.forEach((e) => obs.observe(e))
    return () => obs.disconnect()
  }, [report])

  const title = cleanTitle(doc.tytul)
  const minutes = readingMinutes(report.words)
  const longDesc = (doc.opis?.length ?? 0) > 360
  const opis = doc.opis && longDesc && !more ? `${doc.opis.slice(0, 340).replace(/\s+\S*$/, '')}…` : doc.opis
  const hasText = report.blocks.length > 0

  const step = (d: 1 | -1) => setHit((h) => (hits ? (h + d + hits) % hits : 0))

  const toc = (
    <nav aria-label="Spis treści dokumentu" className="zs-toc">
      <ol>
        {report.headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? 'is-sub' : undefined}>
            <a href={`#${h.id}`} aria-current={active === h.id ? 'location' : undefined}
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById(h.id)
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                el?.focus({ preventScroll: true })
                history.replaceState(null, '', `#${h.id}`)
              }}>
              {tocLabel(h.text)}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )

  return (
    <div className="container page zs-doc zs-read">
      <div className="zs-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>

      <nav aria-label="Ścieżka nawigacji" className="breadcrumbs">
        <ol>
          <li><Link to="/zasobnik">Zasobnik wiedzy</Link></li>
          <li><Link to="/zasobnik?dzial=wyzwania">Wyzwania Małopolski</Link></li>
          <li aria-current="page">{title}</li>
        </ol>
      </nav>

      <header className="zs-read-hero" data-tour="zasobnik-raport-naglowek">
        <p className="zs-read-kicker"><BookOpen size={16} aria-hidden="true" /> {TYP_NAZWA[doc.typ]}</p>
        <h1>{title}</h1>
        {opis && (
          <p className="zs-read-lead">
            {opis}{' '}
            {longDesc && <button type="button" className="btn-link" onClick={() => setMore((m) => !m)} aria-expanded={more}>{more ? 'Pokaż mniej' : 'Czytaj dalej'}</button>}
          </p>
        )}
        <ul className="zs-read-meta">
          {doc.rok && <li><Calendar size={16} aria-hidden="true" /> {doc.rok}</li>}
          {doc.strony && <li><FileText size={16} aria-hidden="true" /> {plural(doc.strony, 'strona', 'strony', 'stron')}</li>}
          {hasText && <li><Clock size={16} aria-hidden="true" /> ok. {minutes} min czytania</li>}
          {doc.licencja && <li><Scale size={16} aria-hidden="true" /> {doc.licencja}</li>}
        </ul>
        <div className="zs-read-actions" data-tour="zasobnik-raport-pdf">
          <a href={doc.url_zrodlowy} className="btn btn-primary" target="_blank" rel="noreferrer">
            <FileText size={18} aria-hidden="true" /> Otwórz PDF{doc.rozmiar ? ` (${doc.rozmiar})` : ''}<NewTab />
          </a>
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}><Printer size={18} aria-hidden="true" /> Drukuj</button>
          <a href={doc.url_zrodlowy} className="btn btn-ghost" target="_blank" rel="noreferrer"><ExternalLink size={18} aria-hidden="true" /> Strona ROPS<NewTab /></a>
        </div>
      </header>

      {!hasText ? (
        <section className="detail-section" aria-labelledby="doc-text-h">
          <h2 id="doc-text-h">Wersja tekstowa</h2>
          <p><span className="empty">Brak wersji tekstowej.</span> Otwórz dokument na stronie ROPS.</p>
        </section>
      ) : (
        <div className="zs-read-grid">
          <aside className="zs-read-nav" aria-label="Nawigacja po dokumencie">
            <ReportSearch query={query} setQuery={setQuery} onStep={step} current={hit} total={hits} />
            {report.headings.length > 0 && (
              <details className="zs-toc-wrap" open={wide} data-tour="zasobnik-raport-spis">
                <summary>Spis treści ({report.headings.length})</summary>
                {toc}
              </details>
            )}
            <p className="hint zs-read-source" data-tour="zasobnik-raport-licencja">
              {doc.licencja ? (
                <>Licencja: <a href="https://creativecommons.org/licenses/by/4.0/deed.pl" target="_blank" rel="noreferrer">{doc.licencja}<NewTab /></a>. </>
              ) : 'Źródło: ROPS Kraków. '}
              Tekst wyciągnięty automatycznie z PDF, tabele i rysunki mogą wyglądać inaczej niż w oryginale.
            </p>
          </aside>
          <article className="zs-read-main" aria-label="Treść dokumentu" data-tour="zasobnik-raport-tresc">
            <ReportReader report={report} query={query} hitIndex={hit} />
          </article>
        </div>
      )}

      <p className="back-link"><Link to="/zasobnik?dzial=wyzwania">← Wróć do zasobnika wiedzy</Link></p>
    </div>
  )
}
