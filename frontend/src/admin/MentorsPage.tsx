import { useState, type FormEvent } from 'react'
import { mentors, type MentorAdmin, type MentorInput } from '@/api/mentors'
import { POWIATY, SEKTORY, type Sektor } from '@/api/partnerships'
import { Empty, ErrorBox, Loading, SyntheticTag, errorText, useLoad, useTitle } from '@/admin/ui'
import { KATEGORIE } from '@/types/innowacja'

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const EMPTY: MentorInput = {
  nazwa: '', instytucja: '', sektor: 'ngo', obszary: [], powiat: 'm. Kraków', opis: '', email: '', aktywny: true,
}

function MentorForm({ initial, onSaved, onCancel }: {
  initial: MentorAdmin | null; onSaved: (text: string) => void; onCancel: () => void
}) {
  const [v, setV] = useState<MentorInput>(initial ? { ...initial } : EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: keyof MentorInput) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (v.nazwa.trim().length < 2 || v.instytucja.trim().length < 2) return setError('Podaj nazwę i instytucję.')
    if (v.opis.trim().length < 10) return setError('Opis ma mieć co najmniej 10 znaków.')
    if (!EMAIL.test(v.email.trim())) return setError('Podaj poprawny adres e-mail.')
    setError('')
    setBusy(true)
    const data = { ...v, nazwa: v.nazwa.trim(), instytucja: v.instytucja.trim(), opis: v.opis.trim(), email: v.email.trim() }
    try {
      if (initial) await mentors.adminUpdate(initial.id, data)
      else await mentors.adminCreate(data)
      onSaved(`Zapisano mentora: ${data.nazwa}.`)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" onSubmit={submit} noValidate aria-labelledby="mentor-form-h">
      <h2 id="mentor-form-h">{initial ? 'Edytuj mentora' : 'Dodaj mentora'}</h2>
      <div className="field">
        <label htmlFor="mf-nazwa">Imię i nazwisko lub nazwa</label>
        <input id="mf-nazwa" className="input" maxLength={200} value={v.nazwa} onChange={set('nazwa')} />
      </div>
      <div className="field">
        <label htmlFor="mf-inst">Instytucja</label>
        <input id="mf-inst" className="input" maxLength={200} value={v.instytucja} onChange={set('instytucja')} />
      </div>
      <div className="field">
        <label htmlFor="mf-sektor">Sektor</label>
        <select id="mf-sektor" className="select" value={v.sektor} onChange={(e) => setV({ ...v, sektor: e.target.value as Sektor })}>
          {Object.entries(SEKTORY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="mf-powiat">Powiat</label>
        <select id="mf-powiat" className="select" value={v.powiat} onChange={set('powiat')}>
          {POWIATY.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <fieldset className="field">
        <legend>Obszary wsparcia</legend>
        {Object.entries(KATEGORIE).map(([slug, name]) => (
          <label key={slug} className="check">
            <input type="checkbox" checked={v.obszary.includes(slug)}
              onChange={(e) => setV({ ...v, obszary: e.target.checked ? [...v.obszary, slug] : v.obszary.filter((s) => s !== slug) })} />
            {name}
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor="mf-opis">Krótki opis (publiczny)</label>
        <textarea id="mf-opis" className="textarea" rows={3} maxLength={1000} value={v.opis} onChange={set('opis')} />
      </div>
      <div className="field">
        <label htmlFor="mf-email">E-mail (niepubliczny)</label>
        <input id="mf-email" className="input" type="email" maxLength={320} value={v.email} onChange={set('email')} />
        <p className="hint">Na ten adres ROPS wyśle link do sprawy. Nie jest pokazywany publicznie.</p>
      </div>
      <label className="check">
        <input type="checkbox" checked={v.aktywny} onChange={(e) => setV({ ...v, aktywny: e.target.checked })} />
        Aktywny (widoczny publicznie i możliwy do przydziału)
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Zapisywanie…' : 'Zapisz'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Anuluj</button>
      </div>
    </form>
  )
}

/** Panel mentorów: lista, dodawanie, edycja i wyłączanie. */
export default function MentorsAdminPage() {
  useTitle('Mentorzy')
  const { data, error, loading, reload } = useLoad(() => mentors.adminList(), [])
  const [editing, setEditing] = useState<MentorAdmin | 'new' | null>(null)
  const [done, setDone] = useState('')
  const [failure, setFailure] = useState('')

  async function toggle(m: MentorAdmin) {
    setFailure('')
    setDone('')
    try {
      await mentors.adminUpdate(m.id, { aktywny: !m.aktywny })
      setDone(`${m.aktywny ? 'Wyłączono' : 'Włączono'} mentora: ${m.nazwa}.`)
      reload()
    } catch (e) {
      setFailure(errorText(e))
    }
  }

  return (
    <>
      <h1>Mentorzy</h1>
      <p className="lead">
        Lista mentorów dostępnych do przydziału. Mentora do zgłoszenia przypisujesz na stronie zgłoszenia.
      </p>
      <div className="btn-row">
        <button type="button" data-tour="panel-mentorzy-dodaj" className="btn btn-primary" onClick={() => { setEditing('new'); setDone('') }}>Dodaj mentora</button>
      </div>
      <p role="status" className="hint">{done}</p>
      {editing && (
        <MentorForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={(text) => { setEditing(null); setDone(text); reload() }}
        />
      )}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {failure && <ErrorBox message={failure} />}
      {loading && !data && <Loading />}
      {data && data.length === 0 && <Empty>Brak mentorów. Dodaj pierwszego.</Empty>}
      {data && data.length > 0 && (
        <ul className="plain-list">
          {data.map((m) => (
            <li key={m.id} className="panel">
              <p className="meta-line">
                <span className="tag">{SEKTORY[m.sektor]}</span>
                <span className="tag">Powiat: {m.powiat}</span>
                <span className={`tag${m.aktywny ? ' tag-ontime' : ''}`}>{m.aktywny ? 'Aktywny' : 'Wyłączony'}</span>
                {m.syntetyczny && <SyntheticTag />}
              </p>
              <h2>{m.nazwa}</h2>
              <p><strong>{m.instytucja}</strong></p>
              <p>{m.opis}</p>
              <p className="hint">
                {m.obszary.length ? m.obszary.map((s) => KATEGORIE[s] ?? s).join(', ') : 'Bez obszarów'} · {m.email}
              </p>
              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={() => { setEditing(m); setDone('') }}>
                  Edytuj<span className="visually-hidden">: {m.nazwa}</span>
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => toggle(m)}>
                  {m.aktywny ? 'Wyłącz' : 'Włącz'}<span className="visually-hidden">: {m.nazwa}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
