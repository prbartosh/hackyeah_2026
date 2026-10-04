import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mentors } from '@/api/mentors'
import { ErrorBox, Loading, errorText, useLoad } from '@/admin/ui'

/** Przydział mentora do zgłoszenia; mentorzy z obszarem zgłoszenia są na górze listy. */
export default function MentorAssign({ ticketId, kategoria, onChange }: {
  ticketId: number; kategoria: string | null; onChange: () => void
}) {
  const state = useLoad(() => mentors.ticketMentor(ticketId), [ticketId])
  const list = useLoad(() => mentors.adminList(), [])
  const [choice, setChoice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  async function assign(mentorId: number | null) {
    setBusy(true)
    setError('')
    setDone('')
    try {
      const next = await mentors.assign(ticketId, mentorId)
      state.setData(next)
      setChoice('')
      setDone(next.mentor ? `Przydzielono mentora: ${next.mentor.nazwa}. Wysłano mu link do sprawy.` : 'Zdjęto mentora ze zgłoszenia.')
      onChange()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const active = (list.data ?? []).filter((m) => m.aktywny)
  const matching = active.filter((m) => kategoria && m.obszary.includes(kategoria))
  const others = active.filter((m) => !matching.includes(m))
  const current = state.data?.mentor

  return (
    <section aria-labelledby="mentor-h" className="panel" data-tour="panel-mentor">
      <h2 id="mentor-h">Mentor</h2>
      {state.loading && !state.data && <Loading />}
      {state.error && <ErrorBox message={state.error} onRetry={state.reload} />}
      {state.data?.mentor_prosba && !current && (
        <p className="alert alert-warning" role="status">Autor prosi o mentora.</p>
      )}
      {current && (
        <p>
          Przydzielony: <strong>{current.nazwa}</strong> ({current.instytucja}).{' '}
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => assign(null)}>Zdejmij mentora</button>
        </p>
      )}
      {state.data && (
        <>
          <div className="field">
            <label htmlFor="mentor-choice">{current ? 'Zmień mentora' : 'Wybierz mentora'}</label>
            <select id="mentor-choice" data-tour="panel-mentor-wybor" className="select" value={choice} onChange={(e) => setChoice(e.target.value)}>
              <option value="">—</option>
              {matching.length > 0 && (
                <optgroup label="Pasują do obszaru zgłoszenia">
                  {matching.map((m) => <option key={m.id} value={m.id}>{m.nazwa}, {m.powiat}</option>)}
                </optgroup>
              )}
              {others.length > 0 && (
                <optgroup label={matching.length ? 'Pozostali mentorzy' : 'Mentorzy'}>
                  {others.map((m) => <option key={m.id} value={m.id}>{m.nazwa}, {m.powiat}</option>)}
                </optgroup>
              )}
            </select>
            <p className="hint">Mentor dostanie e-mail z linkiem do rozmowy, a w wątku pojawi się informacja o jego dołączeniu.</p>
          </div>
          <div className="btn-row">
            <button type="button" data-tour="panel-mentor-przydziel" className="btn btn-primary" disabled={busy || !choice} onClick={() => assign(Number(choice))}>
              Przydziel mentora
            </button>
            <Link className="btn btn-ghost" to="/admin/mentorzy">Zarządzaj mentorami</Link>
          </div>
        </>
      )}
      {list.error && <ErrorBox message={list.error} onRetry={list.reload} />}
      {error && <p className="field-error" role="alert">{error}</p>}
      <p role="status" className="hint">{done}</p>
    </section>
  )
}
