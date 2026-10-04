import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Printer, X } from 'lucide-react'
import { getInnovation } from '@/api/innovations'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { MIN_COMPARE, parseSlugs } from '@/lib/compare'
import { kategoriaNazwa, type Innowacja } from '@/types/innowacja'
import '@/styles/compare.css'

type Loaded = { key: string; items: (Innowacja | null)[]; failed: boolean }

const brak = <span className="empty">Brak danych</span>
const text = (v: string | null) => v ?? brak

function materialy(r: Innowacja): ReactNode {
  const links = [
    r.youtube_url && { label: 'Film', href: r.youtube_url },
    r.pdf_url && { label: 'Folder (PDF)', href: r.pdf_url },
    r.materialy_url && { label: 'Pakiet materiałów (ZIP)', href: r.materialy_url },
  ].filter((l): l is { label: string; href: string } => !!l)
  if (!links.length) return brak
  return (
    <ul>
      {links.map((l) => (
        <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer">{l.label}<span className="visually-hidden"> (nowa karta): {r.nazwa}</span></a></li>
      ))}
    </ul>
  )
}

const ROWS: { label: string; render: (r: Innowacja) => ReactNode }[] = [
  { label: 'Kategoria', render: (r) => text(kategoriaNazwa(r.kategorie)) },
  { label: 'Problem', render: (r) => text(r.problem) },
  { label: 'Grupa docelowa', render: (r) => text(r.grupa_docelowa) },
  { label: 'Kto może skorzystać', render: (r) => text(r.kto_moze_skorzystac) },
  { label: 'Czy działa (ocena ROPS)', render: (r) => text(r.czy_dziala) },
  { label: 'Polecana przez ROPS', render: (r) => (r.wybrana_do_upowszechniania ? 'Tak' : 'Nie') },
  { label: 'Organizacja', render: (r) => text(r.organizacja) },
  { label: 'Dostępne materiały', render: materialy },
  {
    label: 'Licencja',
    render: (r) => r.licencja
      ? <a href={r.licencja} target="_blank" rel="noreferrer">{/by\/4\.0/i.test(r.licencja) ? 'CC BY 4.0' : 'Zobacz licencję'}<span className="visually-hidden"> (nowa karta)</span></a>
      : brak,
  },
  {
    label: 'Dalej',
    render: (r) => (
      <>
        <Link to={`/innowacja/${r.slug}/wdrozenie`} className="btn btn-primary">Wdróż u siebie<span className="visually-hidden">: {r.nazwa}</span></Link>
        <br />
        <Link to={`/innowacja/${r.slug}`}>Strona innowacji<span className="visually-hidden">: {r.nazwa}</span></Link>
      </>
    ),
  },
]

export default function ComparePage() {
  useDocumentTitle('Porównanie innowacji · Splot')
  const [params, setParams] = useSearchParams()
  const slugs = parseSlugs(params)
  const key = slugs.join(',')
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const narrow = useMediaQuery('(max-width: 47.99rem)')

  useEffect(() => {
    const list = key ? key.split(',') : []
    if (list.length < MIN_COMPARE) return
    const controller = new AbortController()
    Promise.all(list.map((s) => getInnovation(s, controller.signal)))
      .then((items) => setLoaded({ key, items, failed: false }))
      .catch(() => { if (!controller.signal.aborted) setLoaded({ key, items: [], failed: true }) })
    return () => controller.abort()
  }, [key])

  const removeSlug = (slug: string) => {
    const next = new URLSearchParams()
    slugs.filter((s) => s !== slug).forEach((s) => next.append('slug', s))
    setParams(next)
  }

  const head = <h1>Porównanie innowacji</h1>

  if (slugs.length < MIN_COMPARE) {
    return (
      <div className="container page compare-page">
        {head}
        <p>Wybierz co najmniej dwie innowacje, aby je porównać. Użyj przycisku „Dodaj do porównania” w{' '}
          <Link to="/zasobnik">Zasobniku wiedzy</Link>, w wynikach czatu albo na stronie innowacji.</p>
      </div>
    )
  }
  if (!loaded || loaded.key !== key) {
    return <div className="container page compare-page">{head}<p role="status">Wczytywanie porównania…</p></div>
  }
  if (loaded.failed) {
    return <div className="container page compare-page">{head}<p role="alert">Nie udało się wczytać porównania. Odśwież stronę albo spróbuj za chwilę.</p></div>
  }

  const found = loaded.items.filter((r): r is Innowacja => !!r)
  const missing = slugs.filter((_, i) => !loaded.items[i])

  const removeBtn = (r: Innowacja) => (
    <button type="button" className="btn btn-ghost no-print" onClick={() => removeSlug(r.slug)}>
      <X size={16} aria-hidden="true" /> Usuń z porównania<span className="visually-hidden">: {r.nazwa}</span>
    </button>
  )

  return (
    <div className="container page compare-page">
      <div className="compare-head">
        {head}
        <button type="button" className="btn btn-secondary no-print" onClick={() => window.print()}>
          <Printer size={18} aria-hidden="true" /> Drukuj
        </button>
      </div>
      <p className="lead">Adres tej strony zawiera wybrane pozycje, więc możesz go skopiować i wysłać dalej. Dane pochodzą z Biblioteki Innowacji Społecznych ROPS.</p>
      {missing.length > 0 && (
        <p role="alert">Nie znaleziono w bazie: {missing.join(', ')}. Pokazujemy pozostałe pozycje.</p>
      )}
      {found.length === 0 ? (
        <p><Link to="/zasobnik">Wróć do Zasobnika wiedzy</Link></p>
      ) : narrow ? (
        <div className="compare-cards">
          {found.map((r) => (
            <section key={r.slug} className="compare-card" aria-labelledby={`cmp-${r.slug}`}>
              <h2 id={`cmp-${r.slug}`}>{r.nazwa}</h2>
              <dl>
                {ROWS.map((row) => (
                  <div key={row.label}><dt>{row.label}</dt><dd>{row.render(r)}</dd></div>
                ))}
              </dl>
              {removeBtn(r)}
            </section>
          ))}
        </div>
      ) : (
        <table className="compare-table">
          <caption className="visually-hidden">Porównanie wybranych innowacji</caption>
          <thead>
            <tr>
              <th scope="col"><span className="visually-hidden">Cecha</span></th>
              {found.map((r) => (
                <th key={r.slug} scope="col">
                  <Link to={`/innowacja/${r.slug}`}>{r.nazwa}</Link>
                  <div>{removeBtn(r)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {found.map((r) => <td key={r.slug}>{row.render(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
