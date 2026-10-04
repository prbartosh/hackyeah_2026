import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Map as MapIcon, Search } from 'lucide-react'
import { listDocuments, MIN_SZUKANIE, podswietl, searchAll, TYP_NAZWA, type Dokument, type TrafienieDokumentu } from '@/api/documents'
import InnowacjaCard from '@/components/InnowacjaCard'
import { plural } from '@/lib/plural'
import type { Innowacja } from '@/types/innowacja'

const PAGE = 12

function DocCard({ doc, trafienie }: { doc: Dokument; trafienie?: TrafienieDokumentu }) {
  return (
    <article className="zs-card">
      <div className="zs-card-body">
        <div className="zs-card-top">
          <span className="zs-card-kicker">{TYP_NAZWA[doc.typ]}{doc.rok ? `, ${doc.rok}` : ''}</span>
          <ArrowUpRight size={20} aria-hidden="true" className="zs-card-arrow" />
        </div>
        <h3 className="zs-card-title"><Link to={`/dokument/${doc.id}`}>{doc.tytul}</Link></h3>
        {doc.opis && <p className="zs-card-problem">{doc.opis}</p>}
        {trafienie?.po_znaczeniu && <p className="zs-doc-semantic">Podobny temat, bez wpisanych słów</p>}
        {trafienie?.fragment && (
          <p className="zs-doc-snippet" data-tour="zasobnik-fragment">
            {podswietl(trafienie.fragment, trafienie.trafienia).map((c, i) =>
              c.trafienie ? <mark key={i}>{c.tekst}</mark> : c.tekst,
            )}{' '}
            <Link to={`/dokument/${doc.id}${trafienie.strona ? `#strona-${trafienie.strona}` : ''}`}>
              {trafienie.strona ? `Otwórz stronę ${trafienie.strona}` : 'Otwórz dokument'}
              <span className="visually-hidden">: {doc.tytul}</span>
            </Link>
          </p>
        )}
        <p className="zs-doc-meta" data-tour="zasobnik-doc-meta">
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
  const [trafienia, setTrafienia] = useState<Map<string, TrafienieDokumentu>>(new Map())
  const [karty, setKarty] = useState<Innowacja[]>([])
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
    const szukanie = q.trim().length >= MIN_SZUKANIE
    const pobierz = szukanie
      ? searchAll(q, controller.signal).then(({ dokumenty, innowacje }) => ({
          lista: dokumenty.map((h) => h.dokument),
          trafienia: new Map(dokumenty.map((h) => [h.dokument.id, h])),
          innowacje,
        }))
      : listDocuments({ q }, controller.signal).then((lista) => ({
          lista,
          trafienia: new Map<string, TrafienieDokumentu>(),
          innowacje: [] as Innowacja[],
        }))
    pobierz
      .then(({ lista, trafienia, innowacje }) => {
        // Wskaźniki mają własną sekcję; w wynikach szukania pokazujemy je razem z dokumentami
        setDocs(szukanie ? lista : lista.filter((d) => d.typ !== 'wskaznik'))
        setKarty(innowacje)
        setTrafienia(trafienia)
        setShown(PAGE)
      })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [q, attempt])

  const mapa = docs?.find((d) => d.typ === 'mapa-wyzwan')
  const years = useMemo(() => [...new Set((docs ?? []).map((d) => d.rok).filter((r): r is number => !!r))].sort((a, b) => b - a), [docs])
  // Mapa Wyzwań ma własny blok, ale w wynikach szukania pojawia się jak każdy dokument
  const filtered = (docs ?? []).filter((d) => d.typ !== 'mapa-wyzwan' || q.trim().length >= MIN_SZUKANIE)
    .filter((d) => !rok || d.rok === Number(rok))
    .filter((d) => !typ || d.typ === typ)

  return (
    <section className="zs-results container" aria-labelledby="zs-wyzwania-h">
      <h2 id="zs-wyzwania-h" className="zs-h2">Wyzwania Małopolski</h2>
      <p className="zs-lead">
        Raporty, publikacje i Mapa Wyzwań Społecznych ROPS. Każdy dokument ma wersję tekstową, wygodną na telefonie
        i dla czytnika ekranu, oraz link do PDF na stronie ROPS.
      </p>

      {mapa && !q && (
        <div className="zs-feature" data-tour="zasobnik-mapa-blok">
          <MapIcon size={28} aria-hidden="true" className="zs-feature-icon" />
          <div>
            <h3 className="zs-card-title"><Link to={`/dokument/${mapa.id}`}>{mapa.tytul}</Link></h3>
            <p>Najważniejsze wyzwania społeczne: rodzina, seniorzy, niepełnosprawność, ubóstwo i inne obszary, z danymi.</p>
          </div>
        </div>
      )}

      <div className="zs-filters">
        <div className="zs-filter zs-filter-q" data-tour="zasobnik-doc-szukaj">
          <label htmlFor="zs-doc-q">Szukaj w dokumentach, wskaźnikach i innowacjach</label>
          <div className="zs-input-icon">
            <Search size={18} aria-hidden="true" />
            <input id="zs-doc-q" data-tour="zasobnik-doc-szukaj-pole" type="search" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
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
      {docs && filtered.length === 0 && karty.length === 0 && !error && (
        <div className="alert alert-warning"><p>Brak dokumentów dla tych filtrów. Spróbuj innego słowa albo wybierz „Wszystkie lata”.</p></div>
      )}
      {filtered.length > 0 && (
        <ul className="zs-grid" data-tour="zasobnik-doc-wyniki">
          {filtered.slice(0, shown).map((d) => <li key={d.id}><DocCard doc={d} trafienie={trafienia.get(d.id)} /></li>)}
        </ul>
      )}
      {karty.length > 0 && (
        <>
          <h3 className="zs-h2" id="zs-pasujace-h">Pasujące innowacje</h3>
          <p role="status" className="zs-status">Znaleziono: {plural(karty.length, 'innowacja', 'innowacje', 'innowacji')}</p>
          <ul className="zs-grid" aria-labelledby="zs-pasujace-h">
            {karty.map((r) => <li key={r.slug}><InnowacjaCard innowacja={r} kategoria={null} /></li>)}
          </ul>
        </>
      )}
      {filtered.length > shown && (
        <div className="zs-more">
          <button type="button" className="btn btn-secondary" onClick={() => setShown((n) => n + PAGE)}>
            Pokaż więcej (zostało {filtered.length - shown})
          </button>
        </div>
      )}
      <p className="hint zs-source" data-tour="zasobnik-doc-zrodlo">
        Źródło: <a href="https://rops.krakow.pl">Regionalny Ośrodek Polityki Społecznej w Krakowie</a>. Licencja
        podana tylko przy dokumentach, dla których ROPS ją określa.
      </p>
    </section>
  )
}
