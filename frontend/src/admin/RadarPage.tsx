import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/admin/api'
import { Empty, ErrorBox, StatusLine, categoryName, errorText, formatDate, useLoad, useTitle } from '@/admin/ui'
import { ListSkeleton } from '@/components/Skeleton'
import type { Cluster } from '@/admin/types'

function weekLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

/** Wykres słupkowy (ukryty przed czytnikiem) i ta sama informacja w tabeli dla czytnika ekranu. */
function TrendBars({ cluster }: { cluster: Cluster }) {
  const max = Math.max(1, ...cluster.trend.map((w) => w.liczba))
  return (
    <figure className="trend">
      <div className="trend-chart" aria-hidden="true">
        {cluster.trend.map((w) => (
          <div key={w.tydzien} className="trend-col">
            <span className="trend-num">{w.liczba}</span>
            <span className="trend-bar" style={{ height: `${(w.liczba / max) * 100}%` }} />
            <span className="trend-week">{weekLabel(w.tydzien)}</span>
          </div>
        ))}
      </div>
      <figcaption className="hint">Zgłoszenia w kolejnych tygodniach (ostatnie 8 tygodni, data to początek tygodnia).</figcaption>
      <div className="visually-hidden">
        <table>
          <caption>Liczba zgłoszeń tygodniowo: {cluster.nazwa}</caption>
          <thead><tr><th scope="col">Tydzień od</th><th scope="col">Zgłoszenia</th></tr></thead>
          <tbody>
            {cluster.trend.map((w) => <tr key={w.tydzien}><td>{weekLabel(w.tydzien)}</td><td>{w.liczba}</td></tr>)}
          </tbody>
        </table>
      </div>
    </figure>
  )
}

function ClusterCard({ cluster, onNote }: { cluster: Cluster; onNote: () => void }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(cluster.notatka_id !== null)
  const [failure, setFailure] = useState('')
  const [createdNow, setCreatedNow] = useState(false)
  const doneRef = useRef<HTMLParagraphElement>(null)

  // Przycisk zamienia się w informację: fokus przechodzi na nią, żeby nie zgubić miejsca na stronie.
  useEffect(() => {
    if (createdNow) doneRef.current?.focus()
  }, [createdNow])

  async function createNote() {
    if (busy) return
    setBusy(true)
    setFailure('')
    try {
      await api.createNote(cluster)
      setDone(true)
      setCreatedNow(true)
      onNote()
    } catch (e) {
      setFailure(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="panel cluster">
      <h3>{cluster.nazwa}</h3>
      <p className="meta-line">
        <strong>{cluster.liczba} {cluster.liczba === 1 ? 'zgłoszenie' : 'zgłoszeń'}</strong>
        <span>Trend: {cluster.zmiana}</span>
        {cluster.kategoria && <span>{categoryName(cluster.kategoria)}</span>}
      </p>
      <p className="hint">Nazwa {cluster.nazwa_zrodlo === 'ai' ? 'zaproponowana przez AI' : 'ułożona z najczęstszych słów (bez AI)'}.</p>
      <TrendBars cluster={cluster} />
      <h4>Przykładowe zgłoszenia (źródło)</h4>
      <ul className="plain-list">
        {cluster.przyklady.map((p) => (
          <li key={p.id}><Link to={`/admin/zgloszenia/${p.id}`}>Nr {p.id}</Link>: {p.skrot}</li>
        ))}
      </ul>
      {failure && <p className="field-error" role="alert">{failure}</p>}
      {done ? (
        <p ref={doneRef} tabIndex={-1} className="admin-done">
          {createdNow ? 'Notatka utworzona.' : 'Notatka dla tej grupy już istnieje.'} <a href="#notes-h">Przejdź do notatek</a>
        </p>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn btn-primary" aria-disabled={busy || undefined} onClick={createNote}>
            {busy ? 'Tworzenie…' : 'Utwórz notatkę dla ROPS'}
          </button>
        </div>
      )}
    </li>
  )
}

export default function RadarPage() {
  useTitle('Radar trendów')
  const radar = useLoad(() => api.radar(), [])
  const notes = useLoad(() => api.notes(), [])
  const [failure, setFailure] = useState('')
  const [message, setMessage] = useState('')

  async function toggle(id: number, wykonana: boolean) {
    setFailure('')
    setMessage('')
    // Pole zaznacza się od razu; po błędzie wraca do poprzedniego stanu (ponowne wczytanie).
    if (notes.data) notes.setData(notes.data.map((n) => (n.id === id ? { ...n, wykonana } : n)))
    try {
      await api.setNoteDone(id, wykonana)
      setMessage(wykonana ? 'Notatkę oznaczono jako zrobioną.' : 'Notatkę oznaczono jako do zrobienia.')
      notes.reload()
    } catch (e) {
      setFailure(errorText(e))
      notes.reload()
    }
  }

  const data = radar.data
  return (
    <>
      <h1>Radar trendów</h1>
      <p className="lead">
        Zgłoszenia, dla których w bazie nie ma dobrego rozwiązania, zebrane w grupy o podobnej potrzebie.
        Pokazują, jakich innowacji brakuje.
      </p>
      {radar.error && <ErrorBox message={radar.error} onRetry={radar.reload} />}
      {radar.loading && !data && <ListSkeleton label="Liczenie grup zgłoszeń…" count={2} />}
      {data?.komunikat && <p className="alert alert-warning" role="status">{data.komunikat}</p>}
      {data && (
        <>
          <p>
            Bez dopasowania w bazie: <strong>{data.bez_dopasowania}</strong>.
            {data.nieprzeanalizowane > 0 && <> Zgłoszeń jeszcze nieprzeanalizowanych: {data.nieprzeanalizowane} (otwórz je w skrzynce, żeby wliczyły się do radaru).</>}
          </p>
          <h2>Grupy potrzeb</h2>
          {data.klastry.length === 0
            ? <Empty>Brak zgłoszeń bez dopasowania. Wszystkie dotychczasowe potrzeby mają swoje karty w bazie.</Empty>
            : <ul className="cluster-list">{data.klastry.map((c) => <ClusterCard key={c.klucz} cluster={c} onNote={notes.reload} />)}</ul>}
        </>
      )}

      <h2 id="notes-h" tabIndex={-1}>Notatki dla ROPS</h2>
      <StatusLine message={message} error={failure} />
      {notes.loading && !notes.data && <ListSkeleton count={2} />}
      {notes.error && <ErrorBox message={notes.error} onRetry={notes.reload} />}
      {notes.data && notes.data.length === 0 && <Empty>Nie ma jeszcze notatek. Utwórz je z grup zgłoszeń powyżej.</Empty>}
      {notes.data && notes.data.length > 0 && (
        <ul className="plain-list">
          {notes.data.map((n) => (
            <li key={n.id} className="panel">
              <label className="admin-check">
                <input type="checkbox" checked={n.wykonana} onChange={(e) => toggle(n.id, e.target.checked)} />
                <span><strong>{n.tytul}</strong> <span className="hint">{formatDate(n.created_at)}, {n.wykonana ? 'zrobione' : 'do zrobienia'}</span></span>
              </label>
              <p className="pre">{n.tresc}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
