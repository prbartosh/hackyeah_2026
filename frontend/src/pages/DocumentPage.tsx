import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink, FileText } from 'lucide-react'
import { getDocument, splitPages, TYP_NAZWA, type DokumentSzczegoly } from '@/api/documents'
import IndicatorExplorer from '@/components/IndicatorExplorer'
import ReportDocument from '@/components/ReportDocument'
import { parseIndicatorTable } from '@/lib/indicator'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { plural } from '@/lib/plural'
import '@/styles/zasobnik.css'

function NewTab() {
  return <span className="visually-hidden"> (otwiera się w nowej karcie)</span>
}

export default function DocumentPage() {
  const { id = '' } = useParams()
  const [state, setState] = useState<{ id: string; data: DokumentSzczegoly | null; failed?: boolean } | null>(null)
  const doc = state?.id === id ? state.data : null
  const table = useMemo(() => (doc?.typ === 'wskaznik' ? parseIndicatorTable(doc.tresc) : null), [doc])
  useDocumentTitle(`${doc ? doc.tytul : 'Dokument'} – Zasobnik wiedzy – Splot`)

  useEffect(() => {
    const controller = new AbortController()
    getDocument(id, controller.signal)
      .then((data) => setState({ id, data }))
      .catch(() => { if (!controller.signal.aborted) setState({ id, data: null, failed: true }) })
    return () => controller.abort()
  }, [id])

  const dzial = doc?.typ === 'wskaznik' ? 'wskazniki' : 'wyzwania'
  const back = <Link to={`/zasobnik?dzial=${dzial}`}>← Wróć do zasobnika wiedzy</Link>

  if (!state || state.id !== id) return <div className="container page"><p role="status">Wczytywanie dokumentu…</p></div>
  if (state.failed) {
    return (
      <div className="container page">
        <h1>Nie udało się wczytać dokumentu</h1>
        <p role="alert">Brak połączenia z serwerem. Odśwież stronę albo spróbuj za chwilę.</p>
        <p>{back}</p>
      </div>
    )
  }
  if (!doc) {
    return (
      <div className="container page">
        <h1>Nie znaleziono dokumentu</h1>
        <p>Ten dokument nie istnieje w zasobniku.</p>
        <p>{back}</p>
      </div>
    )
  }

  if (doc.typ !== 'wskaznik') return <ReportDocument key={doc.id} doc={doc} />

  // Tabela powiat × rok jest w wykresach i tabeli powyżej, więc w wersji tekstowej zostaje sam opis wskaźnika
  const tekst = table && doc.tresc ? doc.tresc.split(/^## Wartości według powiatów/m)[0] : doc.tresc
  const pages = tekst ? splitPages(tekst) : []
  const isIndicator = doc.typ === 'wskaznik'
  return (
    <div className="container page zs-doc">
      <nav aria-label="Ścieżka nawigacji" className="breadcrumbs">
        <ol>
          <li><Link to="/zasobnik">Zasobnik wiedzy</Link></li>
          <li><Link to={`/zasobnik?dzial=${dzial}`}>{isIndicator ? 'Wskaźniki' : 'Wyzwania Małopolski'}</Link></li>
          <li aria-current="page">{doc.tytul}</li>
        </ol>
      </nav>

      <div className="detail-layout">
        <article className="detail-main">
          <p className="detail-kicker">{TYP_NAZWA[doc.typ]}{doc.kategoria ? `: ${doc.kategoria.toLocaleLowerCase('pl-PL')}` : ''}</p>
          <h1>{doc.tytul}</h1>
          {doc.opis && <p className="zs-lead">{doc.opis}</p>}

          {table && (
            <section className="detail-section" aria-labelledby="doc-charts-h">
              <h2 id="doc-charts-h">Dane i wykresy</h2>
              <IndicatorExplorer key={doc.id} table={table} name={doc.tytul} />
            </section>
          )}

          <section className="detail-section" aria-labelledby="doc-text-h">
            <h2 id="doc-text-h">Wersja tekstowa</h2>
            {pages.length === 0 ? (
              <p><span className="empty">Brak wersji tekstowej.</span> Otwórz dokument na stronie ROPS.</p>
            ) : (
              <>
                <p className="hint">
                  Tekst wyciągnięty automatycznie z {isIndicator ? 'Obserwatora' : 'pliku PDF'}. Układ tabel i rysunków
                  może się różnić od oryginału.
                </p>
                <div className="zs-doc-pages">
                  {pages.map((p) => (
                    <section key={p.strona} className="zs-doc-page" aria-label={p.strona ? `Strona ${p.strona}` : undefined}>
                      {p.strona > 0 && <h3 className="zs-doc-page-no">Strona {p.strona}</h3>}
                      <div className="zs-doc-text">{p.tekst}</div>
                    </section>
                  ))}
                </div>
              </>
            )}
          </section>
        </article>

        <aside className="detail-side" aria-label="Plik i źródło">
          <section className="side-box">
            <h2>{isIndicator ? 'Źródło danych' : 'Dokument'}</h2>
            <dl className="contact-list">
              {doc.rok && (<><dt>Rok</dt><dd>{doc.rok}</dd></>)}
              {doc.strony && (<><dt>Objętość</dt><dd>{plural(doc.strony, 'strona', 'strony', 'stron')}</dd></>)}
              {doc.zrodlo_danych && (<><dt>Dane</dt><dd>{doc.zrodlo_danych}</dd></>)}
              <dt>Wydawca</dt>
              <dd>Regionalny Ośrodek Polityki Społecznej w Krakowie</dd>
            </dl>
            <a href={doc.url_zrodlowy} className="btn btn-primary btn-block" target="_blank" rel="noreferrer">
              {isIndicator ? <ExternalLink size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
              {isIndicator ? 'Otwórz Obserwatora' : `Otwórz PDF${doc.rozmiar ? ` (${doc.rozmiar})` : ''}`}<NewTab />
            </a>
            {doc.licencja ? (
              <p className="hint">
                Licencja:{' '}
                <a href="https://creativecommons.org/licenses/by/4.0/deed.pl" target="_blank" rel="noreferrer">{doc.licencja}<NewTab /></a>
              </p>
            ) : (
              <p className="hint">Źródło: strona ROPS.</p>
            )}
          </section>
        </aside>
      </div>

      <p className="back-link">{back}</p>
    </div>
  )
}
