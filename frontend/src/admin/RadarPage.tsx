import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { api } from '@/admin/api'
import { Empty, ErrorBox, Loading, categoryName, errorText, formatDate, useLoad, useTitle } from '@/admin/ui'
import type { Cluster } from '@/admin/types'

function weekLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

/** Wykres słupkowy z tą samą informacją w tabeli dla czytnika ekranu. */
function TrendBars({ cluster }: { cluster: Cluster }) {
  const max = Math.max(1, ...cluster.trend.map((w) => w.liczba))
  return (
    <div>
      <div className="bars" aria-hidden="true">
        {cluster.trend.map((w) => (
          <span key={w.tydzien} className="bar" style={{ height: `${(w.liczba / max) * 100}%` }} title={`${weekLabel(w.tydzien)}: ${w.liczba}`}>
            <span className="bar-num">{w.liczba || ''}</span>
          </span>
        ))}
      </div>
      <table className="visually-hidden">
        <caption>Liczba zgłoszeń tygodniowo: {cluster.nazwa}</caption>
        <thead><tr><th scope="col">Tydzień od</th><th scope="col">Zgłoszenia</th></tr></thead>
        <tbody>
          {cluster.trend.map((w) => <tr key={w.tydzien}><td>{weekLabel(w.tydzien)}</td><td>{w.liczba}</td></tr>)}
        </tbody>
      </table>
    </div>
  )
}

function Trend({ change }: { change: string }) {
  const Icon = change === 'rosnący' ? TrendingUp : change === 'malejący' ? TrendingDown : Minus
  return <span className="tag"><Icon size={14} aria-hidden="true" /> Trend: {change}</span>
}

function ClusterCard({ cluster, onNote }: { cluster: Cluster; onNote: () => void }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(cluster.notatka_id !== null)
  const [failure, setFailure] = useState('')

  async function createNote() {
    setBusy(true)
    setFailure('')
    try {
      await api.createNote(cluster)
      setDone(true)
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
        <strong>{cluster.liczba} {cluster.liczba === 1 ? 'zgłoszenie' : 'zgłoszeń'}</strong> · <Trend change={cluster.zmiana} />
        {cluster.kategoria && <> · {categoryName(cluster.kategoria)}</>}
      </p>
      <p className="hint">
        Dlaczego razem: {cluster.powod}. Nazwa{' '}
        {cluster.nazwa_zrodlo === 'slownik'
          ? 'ze słownika problemów'
          : cluster.nazwa_zrodlo === 'ai'
            ? 'zaproponowana przez AI'
            : 'ułożona z najczęstszych słów (bez AI)'}.
      </p>
      <TrendBars cluster={cluster} />
      <p className="hint">Ostatnie 8 tygodni, od najstarszego do bieżącego.</p>
      <h4>Przykładowe zgłoszenia (źródło)</h4>
      <ul className="plain-list">
        {cluster.przyklady.map((p) => (
          <li key={p.id}><Link to={`/admin/zgloszenia/${p.id}`}>Nr {p.id}</Link>: {p.skrot}</li>
        ))}
      </ul>
      {failure && <p className="field-error" role="alert">{failure}</p>}
      <div className="btn-row">
        <button type="button" className="btn btn-primary" disabled={busy || done} onClick={createNote}>
          {done ? 'Notatka dla ROPS już utworzona' : busy ? 'Tworzenie…' : 'Utwórz notatkę dla ROPS'}
        </button>
      </div>
    </li>
  )
}

export default function RadarPage() {
  useTitle('Radar trendów')
  const radar = useLoad(() => api.radar(), [])
  const notes = useLoad(() => api.notes(), [])
  const [failure, setFailure] = useState('')

  async function toggle(id: number, wykonana: boolean) {
    setFailure('')
    try {
      await api.setNoteDone(id, wykonana)
      notes.reload()
    } catch (e) {
      setFailure(errorText(e))
    }
  }

  const data = radar.data
  return (
    <>
      <h1>Radar trendów</h1>
      <p className="lead">
        Zgłoszenia, dla których w bazie nie ma dobrego rozwiązania, zebrane w grupy o podobnej potrzebie.
        To podpowiedź, jakich innowacji brakuje.
      </p>
      {radar.error && <ErrorBox message={radar.error} onRetry={radar.reload} />}
      {radar.loading && !data && <Loading text="Liczenie grup zgłoszeń…" />}
      {data?.komunikat && <p className="alert alert-warning" role="status">{data.komunikat}</p>}
      {data && (
        <>
          <p>
            Bez dopasowania w bazie: <strong>{data.bez_dopasowania}</strong>.
            {data.nieprzeanalizowane > 0 && <> Zgłoszeń jeszcze nieprzeanalizowanych: {data.nieprzeanalizowane} (otwórz je w skrzynce, żeby wliczyły się do radaru).</>}
          </p>
          <h2 data-tour="panel-radar-tytul">Grupy potrzeb</h2>
          {data.klastry.length === 0
            ? <Empty>Brak zgłoszeń bez dopasowania. Wszystkie dotychczasowe potrzeby mają swoje karty w bazie.</Empty>
            : <ul className="cluster-list" data-tour="panel-radar-grupy">{data.klastry.map((c) => <ClusterCard key={c.klucz} cluster={c} onNote={notes.reload} />)}</ul>}
        </>
      )}

      <h2>Notatki dla ROPS</h2>
      {failure && <ErrorBox message={failure} />}
      {notes.error && <ErrorBox message={notes.error} onRetry={notes.reload} />}
      {notes.data && notes.data.length === 0 && <Empty>Nie ma jeszcze notatek. Utwórz je z grup zgłoszeń powyżej.</Empty>}
      {notes.data && notes.data.length > 0 && (
        <ul className="plain-list">
          {notes.data.map((n) => (
            <li key={n.id} className="panel">
              <label className="check">
                <input type="checkbox" checked={n.wykonana} onChange={(e) => toggle(n.id, e.target.checked)} />
                <strong>{n.tytul}</strong> <span className="hint">({formatDate(n.created_at)}) {n.wykonana ? 'zrobione' : 'do zrobienia'}</span>
              </label>
              <p className="pre">{n.tresc}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
