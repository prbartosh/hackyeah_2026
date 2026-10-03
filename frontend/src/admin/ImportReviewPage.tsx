import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/admin/api'
import {
  COST_LABELS, ErrorBox, EVIDENCE_LABELS, FormSkeleton, StatusLine, TIME_LABELS, errorText, useLoad, useTitle,
} from '@/admin/ui'
import type { ImportDetail } from '@/admin/types'
import { KATEGORIE } from '@/types/innowacja'

const ENUM_OPTIONS: Record<string, Record<string, string>> = {
  poziom_dowodu: EVIDENCE_LABELS,
  poziom_kosztu: COST_LABELS,
  czas_startu: TIME_LABELS,
  sektor: KATEGORIE,
}
const LONG = new Set(['opis', 'czy_dziala', 'problem', 'kto_moze_skorzystac', 'grupa_docelowa', 'wymagane_zasoby'])
const ORDER = [
  'nazwa', 'problem', 'grupa_docelowa', 'sektor', 'kto_moze_skorzystac', 'opis', 'czy_dziala',
  'poziom_dowodu', 'poziom_kosztu', 'czas_startu', 'wymagane_zasoby', 'organizacja',
]

type Values = Record<string, string>

function toValues(d: ImportDetail): Values {
  const out: Values = {}
  for (const [key, f] of Object.entries(d.pola)) {
    out[key] = Array.isArray(f.wartosc) ? f.wartosc.join('\n') : (f.wartosc ?? '')
  }
  return out
}

function payload(values: Values): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(values)) {
    out[key] = key === 'wymagane_zasoby' ? v.split('\n').map((s) => s.trim()).filter(Boolean) : v.trim() || null
  }
  return out
}

function FieldStatus({ field, empty, manual }: { field: ImportDetail['pola'][string]; empty: boolean; manual: boolean }) {
  if (field.reczne) return <span className="tag">Wpisane ręcznie</span>
  if (empty && manual) return <span className="tag">Do uzupełnienia ręcznie</span>
  if (empty) return <span className="tag">Brak w dokumencie: uzupełnij albo zostaw puste</span>
  if (field.niska_pewnosc) return <span className="tag tag-warn">Niska pewność: sprawdź z dokumentem</span>
  return <span className="tag tag-ontime">Zgodne z cytatem</span>
}

export default function ImportReviewPage() {
  const id = Number(useParams().id)
  useTitle('Przegląd szkicu karty')
  const { data, error, loading, reload, setData } = useLoad(() => api.importDetail(id), [id])
  const cards = useLoad(() => api.cards({ limit: 100, status: 'opublikowana' }), [])
  const [values, setValues] = useState<Values>({})
  const [update, setUpdate] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [message, setMessage] = useState('')
  const [closedNow, setClosedNow] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (data) setValues(toValues(data))
  }, [data])

  // Po zatwierdzeniu lub odrzuceniu przyciski znikają: fokus na wyniku, w tym samym miejscu strony.
  useEffect(() => {
    if (closedNow) resultRef.current?.focus()
  }, [closedNow])

  if (loading && !data) return <FormSkeleton label="Wczytywanie szkicu…" />
  if (error || !data) return <ErrorBox message={error ?? 'Nie znaleziono importu.'} onRetry={reload} />

  const closed = data.status !== 'szkic'
  const keys = ORDER.filter((k) => k in data.pola)

  async function run(action: () => Promise<ImportDetail>, done?: string) {
    if (busy) return
    setBusy(true)
    setFailure('')
    setMessage('')
    try {
      const next = await action()
      setData(next)
      if (next.status !== 'szkic') setClosedNow(true)
      else if (done) setMessage(done)
    } catch (e) {
      setFailure(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <p><Link to="/admin/importy">Wróć do dokumentów</Link></p>
      <h1>Szkic karty z dokumentu: {data.nazwa_pliku}</h1>
      {data.ekstrakcja_zrodlo === 'ai'
        ? <p className="hint">Szkic przygotowało AI. Obok każdego pola widać fragment dokumentu, z którego pochodzi. Pola bez fragmentu zostały puste.</p>
        : <p className="hint">Szkic nie został wypełniony automatycznie. Uzupełnij pola ręcznie, korzystając z tekstu dokumentu na dole strony.</p>}
      {data.komunikat && <p className="alert alert-warning" role="status">{data.komunikat}</p>}
      {closed && !closedNow && (
        <p className="admin-done">
          {data.status === 'zatwierdzony' ? 'Szkic zatwierdzony, karta opublikowana.' : 'Szkic odrzucony.'} Pola są tylko do odczytu.
          {data.karta_slug && <> <Link to={`/admin/karty/${data.karta_slug}`}>Otwórz kartę</Link></>}
        </p>
      )}

      <div className="review" role="group" aria-label="Pola karty i fragmenty dokumentu">
        <div className="review-head" aria-hidden="true">
          <span>Pole karty</span><span>Fragment dokumentu (źródło)</span>
        </div>
        {keys.map((key) => {
          const field = data.pola[key]
          const fid = `rv-${key}`
          const options = ENUM_OPTIONS[key]
          const empty = !values[key]?.trim()
          return (
            <div className="review-row" key={key}>
              <div className="field">
                <label htmlFor={fid}>{data.etykiety[key] ?? key}</label>
                {options ? (
                  <select id={fid} className="select" value={values[key] ?? ''} disabled={closed}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}>
                    <option value="">Brak danych</option>
                    {Object.entries(options).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                  </select>
                ) : LONG.has(key) ? (
                  <textarea id={fid} className="textarea" rows={key === 'opis' ? 5 : 3} value={values[key] ?? ''} disabled={closed}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    aria-describedby={key === 'wymagane_zasoby' ? `${fid}-hint` : undefined} />
                ) : (
                  <input id={fid} className="input" value={values[key] ?? ''} disabled={closed}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })} />
                )}
                {key === 'wymagane_zasoby' && <p id={`${fid}-hint`} className="hint">Jedno wymaganie w wierszu.</p>}
                <FieldStatus field={field} empty={empty} manual={data.ekstrakcja_zrodlo === 'reczna'} />
              </div>
              <div className="source" aria-label={`Źródło pola: ${data.etykiety[key] ?? key}`}>
                {field.cytat
                  ? <blockquote>{field.cytat}</blockquote>
                  : <p className="empty-state">{data.ekstrakcja_zrodlo === 'reczna'
                    ? 'Brak cytatu: dokument nie został przeanalizowany automatycznie.'
                    : 'Brak cytatu: tego pola nie ma w dokumencie.'}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {!closed && (
        <div className="panel stack">
          <div className="field">
            <label htmlFor="rv-update">Zamiast nowej karty zaktualizuj istniejącą (opcjonalnie)</label>
            <select id="rv-update" className="select" value={update} onChange={(e) => setUpdate(e.target.value)}>
              <option value="">Utwórz nową kartę</option>
              {cards.data?.items.map((c) => <option key={c.slug} value={c.slug}>{c.nazwa}</option>)}
            </select>
            <p className="hint">Przy aktualizacji uzupełniane są tylko pola wpisane powyżej, pozostałe dane karty zostają bez zmian.</p>
          </div>
          <p className="hint">Zatwierdzenie publikuje kartę i od razu włącza ją do wyszukiwarki dla użytkowników.</p>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" aria-disabled={busy || undefined}
              onClick={() => run(async () => { await api.editImport(id, payload(values)); return api.approveImport(id, update || null) })}>
              Zatwierdź i opublikuj kartę
            </button>
            <button type="button" className="btn btn-secondary" aria-disabled={busy || undefined}
              onClick={() => run(() => api.editImport(id, payload(values)), 'Zmiany w szkicu zapisane.')}>
              Zapisz zmiany w szkicu
            </button>
            <button type="button" className="btn btn-ghost" aria-disabled={busy || undefined} onClick={() => run(() => api.rejectImport(id))}>
              Odrzuć szkic
            </button>
          </div>
          <StatusLine message={message} error={failure} />
        </div>
      )}
      {closedNow && (
        <div ref={resultRef} tabIndex={-1} className="admin-done" role="status">
          <p>{data.status === 'odrzucony' ? 'Szkic odrzucony.' : update ? 'Karta zaktualizowana danymi ze szkicu.' : 'Karta opublikowana. Jest już w wyszukiwarce.'}</p>
          <ul className="admin-next">
            {data.karta_slug && <li><Link to={`/admin/karty/${data.karta_slug}`}>Otwórz kartę w panelu</Link></li>}
            {data.karta_slug && <li><Link to={`/innowacja/${data.karta_slug}`}>Zobacz kartę tak, jak widzą ją użytkownicy</Link></li>}
            <li><Link to="/admin/importy">Wgraj kolejny dokument</Link></li>
          </ul>
        </div>
      )}

      <details className="panel" open={data.ekstrakcja_zrodlo === 'reczna'}>
        <summary>Cały tekst dokumentu</summary>
        <div className="pre doc-text" tabIndex={0} role="region" aria-label="Tekst dokumentu">{data.tekst}</div>
      </details>
    </>
  )
}
