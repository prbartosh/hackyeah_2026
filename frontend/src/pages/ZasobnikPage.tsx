import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpDown, Search, X } from 'lucide-react'
import InnowacjaCard from '@/components/InnowacjaCard'
import Kategorie from '@/components/Kategorie'
import { ListSkeleton } from '@/components/Skeleton'
import ZasobnikStats from '@/components/ZasobnikStats'
import ZasobnikWskazniki from '@/components/ZasobnikWskazniki'
import ZasobnikWyzwania from '@/components/ZasobnikWyzwania'
import { getCategories, listInnovations } from '@/api/innovations'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { liczbaInnowacji } from '@/lib/plural'
import { kategoriaNazwa, type Innowacja, type Kategoria } from '@/types/innowacja'
import '@/styles/zasobnik.css'

// Filtry żyją w adresie (?kategoria=&q=&wybrane=1): działa przycisk „wstecz” i da się wysłać link.
export default function ZasobnikPage() {
  useDocumentTitle('Zasobnik wiedzy – Splot')
  const [params, setParams] = useSearchParams()
  const kategoria = params.get('kategoria')
  const q = params.get('q') ?? ''
  const wybrane = params.get('wybrane') === '1'
  const sort = params.get('sort') === 'polecane' ? 'polecane' : 'nazwa'

  const [kategorie, setKategorie] = useState<Kategoria[]>([])
  const [razem, setRazem] = useState(0)
  const [wyniki, setWyniki] = useState<Innowacja[] | null>(null)
  const [wpisane, setWpisane] = useState(q)
  const [blad, setBlad] = useState(false)
  const [proba, setProba] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getCategories(controller.signal)
      .then((k) => {
        setKategorie(k)
        // Każda innowacja ma dokładnie jedną kategorię (baza-innowacji.md), więc suma to liczba wszystkich
        setRazem(k.reduce((suma, kat) => suma + kat.liczba_innowacji, 0))
      })
      .catch(() => { if (!controller.signal.aborted) setBlad(true) })
    return () => controller.abort()
  }, [proba])

  useEffect(() => {
    const controller = new AbortController()
    setBlad(false)
    listInnovations({ kategoria, q, wybrane }, controller.signal)
      .then(setWyniki)
      .catch(() => { if (!controller.signal.aborted) setBlad(true) })
    return () => controller.abort()
  }, [kategoria, q, wybrane, proba])

  // Wpisywanie zmienia adres z opóźnieniem, żeby czytnik ekranu nie ogłaszał liczby po każdej literze
  useEffect(() => {
    if (wpisane === q) return
    const t = setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        if (wpisane) next.set('q', wpisane)
        else next.delete('q')
        return next
      }, { replace: true })
    }, 350)
    return () => clearTimeout(t)
  }, [wpisane, q, setParams])

  function ustaw(zmiany: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(zmiany)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace })
  }

  function wyczysc() {
    setWpisane('')
    setParams({}, { replace: true })
  }

  const dzial = params.get('dzial')
  const nav = (
    <nav aria-label="Działy zasobnika" className="zs-sections">
      <Link to="/zasobnik" aria-current={!dzial ? 'page' : undefined}>Innowacje</Link>
      <Link to="/zasobnik?dzial=wyzwania" aria-current={dzial === 'wyzwania' ? 'page' : undefined}>Wyzwania i raporty</Link>
      <Link to="/zasobnik?dzial=wskazniki" aria-current={dzial === 'wskazniki' ? 'page' : undefined}>Wskaźniki</Link>
    </nav>
  )
  if (dzial === 'wyzwania' || dzial === 'wskazniki') {
    return (
      <div className="zs-root">
        <section className="zs-hero container" aria-labelledby="zs-h1">
          <p className="zs-eyebrow">Biblioteka ROPS Kraków</p>
          <h1 id="zs-h1" className="zs-title">Zasobnik wiedzy</h1>
          {nav}
        </section>
        {dzial === 'wyzwania' ? <ZasobnikWyzwania /> : <ZasobnikWskazniki />}
      </div>
    )
  }

  const posortowane = wyniki && sort === 'polecane'
    ? [...wyniki].sort((a, b) => Number(b.wybrana_do_upowszechniania) - Number(a.wybrana_do_upowszechniania))
    : wyniki
  const aktywneFiltry = Boolean(kategoria || q || wybrane)
  const nazwaWybranej = kategoria ? (kategorie.find((k) => k.slug === kategoria)?.nazwa ?? kategoria) : null
  const komunikat =
    blad
      ? 'Nie udało się wczytać innowacji'
      : wyniki === null
      ? 'Wczytywanie…'
      : wyniki.length === 0
        ? 'Brak innowacji spełniających kryteria'
        : `Znaleziono: ${liczbaInnowacji(wyniki.length)}`

  return (
    <div className="zs-root">
      <section className="zs-hero container" aria-labelledby="zs-h1">
        <p className="zs-eyebrow">Biblioteka ROPS Kraków</p>
        <h1 id="zs-h1" className="zs-title">Zasobnik wiedzy</h1>
        <p className="zs-sub">Sprawdzone innowacje społeczne, raporty i dane o Małopolsce w jednym miejscu. Znajdź rozwiązanie, które już działa.</p>
        <ZasobnikStats innowacje={razem} kategorie={kategorie.length} />
        {nav}

        <form
          role="search"
          className="zs-composer"
          onSubmit={(e) => {
            e.preventDefault()
            ustaw({ q: wpisane.trim() || null }, true)
          }}
        >
          <label htmlFor="zs-q" className="visually-hidden">Szukaj w nazwie, problemie i opisie innowacji</label>
          <div className="zs-composer-row">
            <Search size={22} aria-hidden="true" className="zs-composer-icon" />
            <input
              id="zs-q"
              type="search"
              className="zs-composer-input"
              placeholder="Opisz problem lub wpisz słowo kluczowe…"
              value={wpisane}
              onChange={(e) => setWpisane(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
            />
            <button type="submit" className="btn btn-primary zs-composer-submit">Szukaj</button>
          </div>
          <div className="zs-composer-tools">
            <button
              type="button"
              className="zs-chip zs-chip-toggle"
              aria-pressed={wybrane}
              onClick={() => ustaw({ wybrane: wybrane ? null : '1' })}
            >
              Tylko polecane przez ROPS do upowszechniania
            </button>
          </div>
        </form>

        <Kategorie kategorie={kategorie} razem={razem} wybrana={kategoria} onSelect={(slug) => ustaw({ kategoria: slug })} />
      </section>

      <section aria-labelledby="zs-wyniki-h" className="zs-results container">
        <div className="zs-results-head">
          <div>
            <h2 id="zs-wyniki-h" className="zs-h2">Innowacje</h2>
            <p role="status" className="zs-status">
              {komunikat}
              {nazwaWybranej && wyniki && wyniki.length > 0 ? ` w kategorii „${nazwaWybranej}”` : ''}
            </p>
          </div>
          <div className="zs-results-tools">
            <div className="zs-filter zs-sort">
              <label htmlFor="zs-sort"><ArrowUpDown size={16} aria-hidden="true" /> Sortuj</label>
              <select id="zs-sort" className="select" value={sort} onChange={(e) => ustaw({ sort: e.target.value === 'nazwa' ? null : e.target.value }, true)}>
                <option value="nazwa">Alfabetycznie</option>
                <option value="polecane">Polecane przez ROPS najpierw</option>
              </select>
            </div>
            {aktywneFiltry && (
              <button type="button" className="btn btn-secondary" onClick={wyczysc}>
                <X size={18} aria-hidden="true" /> Wyczyść filtry
              </button>
            )}
          </div>
        </div>

        {blad && (
          <div className="alert alert-error">
            <p role="alert">Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.</p>
            <button type="button" className="btn btn-secondary" onClick={() => { setWyniki(null); setProba((n) => n + 1) }}>
              Spróbuj ponownie
            </button>
          </div>
        )}
        {!blad && wyniki === null && <ListSkeleton count={6} listClassName="zs-grid" />}
        {!blad && wyniki && wyniki.length === 0 && (
          <div className="alert alert-warning">
            <p>Nie znaleziono innowacji dla tych filtrów. Spróbuj innego słowa, krótszej frazy albo wyczyść filtry.</p>
          </div>
        )}
        {!blad && posortowane && posortowane.length > 0 && (
          <ul className="zs-grid">
            {posortowane.map((r) => (
              <li key={r.slug}>
                <InnowacjaCard innowacja={r} kategoria={kategoriaNazwa(r.kategorie)} />
              </li>
            ))}
          </ul>
        )}

        <p className="hint zs-source">
          Źródło: <a href="https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie">Biblioteka Innowacji Społecznych ROPS Kraków</a>,
          licencja CC BY 4.0.
        </p>
      </section>
    </div>
  )
}
