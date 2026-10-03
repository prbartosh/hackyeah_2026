import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { listDocuments, TYP_NAZWA, type Dokument } from '@/api/documents'
import { ListSkeleton } from '@/components/Skeleton'
import { plural } from '@/lib/plural'

const PAGE = 12

function DocCard({ doc }: { doc: Dokument }) {
  return (
    <article className="zs-card">
      <div className="zs-card-body">
        <div className="zs-card-top">
          <span className="zs-card-kicker">{TYP_NAZWA[doc.typ]}{doc.rok ? `, ${doc.rok}` : ''}</span>
        </div>
        <h3 className="zs-card-title"><Link to={`/dokument/${doc.id}`}>{doc.tytul}</Link></h3>
        {doc.opis && <p className="zs-card-problem">{doc.opis}</p>}
        <p className="zs-doc-meta">
          {doc.strony && <span>{plural(doc.strony, 'strona', 'strony', 'stron')}</span>}
          {doc.licencja && <span>{doc.licencja}</span>}
        </p>
      </div>
    </article>
  )
}

/** Wyzwania Małopolski: Mapa Wyzwań Społecznych, publikacje i raporty ROPS z filtrem po roku. */
export default function ZasobnikWyzwania() {
  const [docs, setDocs] = useState<Dokument[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [typed, setTyped] = useState('')
  const [q, setQ] = useState('')
  const [rok, setRok] = useState('')
  const [typ, setTyp] = useState('')
  const [shown, setShown] = useState(PAGE)

  useEffect(() => {
    const t = setTimeout(() => setQ(typed), 350)
    return () => clearTimeout(t)
  }, [typed])

  useEffect(() => {
    const controller = new AbortController()
    setError(false)
    listDocuments({ q }, controller.signal)
      .then((all) => { setDocs(all.filter((d) => d.typ !== 'wskaznik')); setShown(PAGE) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [q, attempt])

  const mapa = docs?.find((d) => d.typ === 'mapa-wyzwan')
  const years = useMemo(() => [...new Set((docs ?? []).map((d) => d.rok).filter((r): r is number => !!r))].sort((a, b) => b - a), [docs])
  const filtered = (docs ?? []).filter((d) => d.typ !== 'mapa-wyzwan')
    .filter((d) => !rok || d.rok === Number(rok))
    .filter((d) => !typ || d.typ === typ)

  return (
    <section className="zs-results container" aria-labelledby="zs-wyzwania-h">
      <h2 id="zs-wyzwania-h" className="zs-h2">Wyzwania Małopolski</h2>
      <p className="zs-lead">
        Raporty, publikacje i Mapa Wyzwań Społecznych ROPS. Każdy dokument przeczytasz tutaj jako tekst
        (także na telefonie i czytnikiem ekranu) albo otworzysz w PDF na stronie ROPS.
      </p>

      {mapa && !q && (
        <div className="zs-feature">
          <h3 className="zs-card-title"><Link to={`/dokument/${mapa.id}`}>{mapa.tytul}</Link></h3>
          <p>Najważniejsze wyzwania społeczne: rodzina, seniorzy, niepełnosprawność, ubóstwo i inne obszary, z danymi.</p>
        </div>
      )}

      <div className="zs-filters">
        <div className="zs-filter zs-filter-q">
          <label htmlFor="zs-doc-q">Szukaj w tytule i opisie</label>
          <div className="zs-input-icon">
            <Search size={18} aria-hidden="true" />
            <input id="zs-doc-q" type="search" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        </div>
        <div className="zs-filter">
          <label htmlFor="zs-doc-typ">Rodzaj</label>
          <select id="zs-doc-typ" className="select" value={typ} onChange={(e) => { setTyp(e.target.value); setShown(PAGE) }}>
            <option value="">Wszystkie</option>
            <option value="raport">Raporty</option>
            <option value="publikacja">Publikacje</option>
          </select>
        </div>
        <div className="zs-filter">
          <label htmlFor="zs-doc-rok">Rok</label>
          <select id="zs-doc-rok" className="select" value={rok} onChange={(e) => { setRok(e.target.value); setShown(PAGE) }}>
            <option value="">Wszystkie lata</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <p role="status" className="zs-status">
        {error ? 'Nie udało się wczytać dokumentów' : docs === null ? 'Wczytywanie…' : `Znaleziono: ${plural(filtered.length, 'dokument', 'dokumenty', 'dokumentów')}`}
      </p>
      {error && (
        <div className="alert alert-error">
          <p role="alert">Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.</p>
          <button type="button" className="btn btn-secondary" onClick={() => setAttempt((n) => n + 1)}>Spróbuj ponownie</button>
        </div>
      )}
      {docs === null && !error && <ListSkeleton count={6} listClassName="zs-grid" />}
      {docs && filtered.length === 0 && !error && (
        <div className="alert alert-warning"><p>Brak dokumentów dla tych filtrów. Spróbuj innego słowa albo wybierz „Wszystkie lata”.</p></div>
      )}
      {filtered.length > 0 && (
        <ul className="zs-grid">
          {filtered.slice(0, shown).map((d) => <li key={d.id}><DocCard doc={d} /></li>)}
        </ul>
      )}
      {filtered.length > shown && (
        <div className="zs-more">
          <button type="button" className="btn btn-secondary" onClick={() => setShown((n) => n + PAGE)}>
            Pokaż więcej (zostało {filtered.length - shown})
          </button>
        </div>
      )}
      <p className="hint zs-source">
        Źródło: <a href="https://rops.krakow.pl">Regionalny Ośrodek Polityki Społecznej w Krakowie</a>. Licencja
        podana tylko przy dokumentach, dla których ROPS ją określa.
      </p>
    </section>
  )
}
