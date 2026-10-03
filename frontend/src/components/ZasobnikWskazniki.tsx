import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { listDocuments, type Dokument } from '@/api/documents'
import { normalizeText } from '@/lib/text'
import { plural } from '@/lib/plural'

const capitalize = (s: string) => s.charAt(0) + s.slice(1).toLocaleLowerCase('pl-PL')

/** Wskaźniki Obserwatora Statystyk Społecznych pogrupowane po kategoriach. */
export default function ZasobnikWskazniki() {
  const [docs, setDocs] = useState<Dokument[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [q, setQ] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setError(false)
    listDocuments({ typ: 'wskaznik' }, controller.signal)
      .then(setDocs)
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [attempt])

  const groups = useMemo(() => {
    const words = normalizeText(q).split(' ').filter(Boolean)
    const map = new Map<string, Dokument[]>()
    for (const d of docs ?? []) {
      const hay = normalizeText(`${d.tytul} ${d.opis ?? ''} ${d.kategoria ?? ''}`)
      if (!words.every((w) => hay.includes(w))) continue
      const key = d.kategoria ?? 'INNE'
      map.set(key, [...(map.get(key) ?? []), d])
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'pl'))
  }, [docs, q])
  const total = groups.reduce((n, [, items]) => n + items.length, 0)

  return (
    <section className="zs-results container" aria-labelledby="zs-wsk-h">
      <h2 id="zs-wsk-h" className="zs-h2">Wskaźniki Obserwatora</h2>
      <p className="zs-lead">
        Dane o gminach i powiatach Małopolski z{' '}
        <a href="https://obserwator.rops.krakow.pl/">Obserwatora Statystyk Społecznych ROPS</a>. Każdy wskaźnik ma opis,
        źródło danych i tabelę wartości.
      </p>
      <div className="zs-filters">
        <div className="zs-filter zs-filter-q">
          <label htmlFor="zs-wsk-q">Szukaj wskaźnika</label>
          <div className="zs-input-icon">
            <Search size={18} aria-hidden="true" />
            <input id="zs-wsk-q" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          </div>
        </div>
      </div>
      <p role="status" className="zs-status">
        {error ? 'Nie udało się wczytać wskaźników' : docs === null ? 'Wczytywanie…' : `Znaleziono: ${plural(total, 'wskaźnik', 'wskaźniki', 'wskaźników')}`}
      </p>
      {error && (
        <div className="alert alert-error">
          <p role="alert">Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.</p>
          <button type="button" className="btn btn-secondary" onClick={() => setAttempt((n) => n + 1)}>Spróbuj ponownie</button>
        </div>
      )}
      <div className="zs-groups">
        {groups.map(([kategoria, items]) => (
          <details key={kategoria} className="zs-group" open={Boolean(q)}>
            <summary>
              <span className="zs-group-name">{capitalize(kategoria)}</span>
              <span className="zs-chip-count">{items.length}</span>
            </summary>
            <ul className="zs-group-list">
              {items.map((d) => (
                <li key={d.id}>
                  <Link to={`/dokument/${d.id}`}>{d.tytul}</Link>
                  {d.zrodlo_danych && <span className="hint"> · {d.zrodlo_danych}</span>}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  )
}
