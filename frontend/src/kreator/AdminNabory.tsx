import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBox, Loading, SyntheticTag, errorText, useLoad, useTitle } from '@/admin/ui'
import { kreator } from '@/kreator/api'
import { formatDay, keyFromLabel } from '@/kreator/helpers'
import type { Kryterium, NaborInput, NaborPole, PoleFiszki } from '@/kreator/types'
import { KATEGORIE } from '@/types/innowacja'

const STATUS_LABELS = { aktywny: 'Trwa teraz', zaplanowany: 'Zaplanowany', zakonczony: 'Zakończony' }
const FISZKA_FIELDS: { value: PoleFiszki; label: string }[] = [
  { value: 'istota', label: 'Istota pomysłu' },
  { value: 'odbiorca', label: 'Dla kogo' },
  { value: 'etap', label: 'Etap realizacji' },
  { value: 'obszar', label: 'Obszar' },
  { value: 'lokalizacja', label: 'Lokalizacja' },
  { value: 'potrzeby', label: 'Potrzeby' },
]

export function NaboryPage() {
  useTitle('Nabory grantowe')
  const { data, error, loading, reload } = useLoad(() => kreator.adminNabory(), [])
  return (
    <>
      <h1>Nabory grantowe</h1>
      <p className="lead">Generator wniosków jest widoczny dla użytkowników tylko w czasie trwania naboru (według dat poniżej).</p>
      <div className="btn-row"><Link className="btn btn-primary" data-tour="panel-nabory-dodaj" to="/admin/nabory/nowy">Dodaj nabór</Link></div>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.items.length === 0 && <p className="empty-state">Nie ma jeszcze żadnego naboru.</p>}
      {data && data.items.length > 0 && (
        <div className="table-wrap">
          <table className="admin-table">
            <caption className="visually-hidden">Lista naborów</caption>
            <thead><tr><th scope="col">Nabór</th><th scope="col">Termin</th><th scope="col">Stan</th><th scope="col">Pola wniosku</th></tr></thead>
            <tbody>
              {data.items.map((n) => (
                <tr key={n.slug}>
                  <th scope="row" className="cell-main"><Link to={`/admin/nabory/${n.slug}`}>{n.nazwa}</Link> {n.syntetyczny && <SyntheticTag />}</th>
                  <td>{formatDay(n.termin_od)} – {formatDay(n.termin_do)}</td>
                  <td><span className={n.status === 'aktywny' ? 'tag tag-ontime' : 'tag'}>{STATUS_LABELS[n.status]}</span></td>
                  <td>{n.pola.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

const EMPTY_FIELD: NaborPole = { klucz: '', etykieta: '', limit: 1000, wskazowka: '', zrodla: [] }
const today = () => new Date().toISOString().slice(0, 10)

export function NaborEditPage() {
  const { slug = 'nowy' } = useParams()
  const isNew = slug === 'nowy'
  useTitle(isNew ? 'Nowy nabór' : 'Edycja naboru')
  const navigate = useNavigate()
  const [form, setForm] = useState<NaborInput | null>(isNew ? {
    nazwa: '', organizator: '', opis: '', url_zrodlowy: '', termin_od: today(), termin_do: today(),
    pola: [{ ...EMPTY_FIELD, etykieta: 'Opis projektu', zrodla: ['istota', 'etap'] }], kryteria: [], obszary: [], odbiorcy: [],
  } : null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isNew) return
    kreator.adminNabor(slug).then(setForm).catch((e) => setLoadError(errorText(e)))
  }, [slug, isNew])

  if (loadError) return <><h1>Nabór</h1><ErrorBox message={loadError} /></>
  if (!form) return <Loading />

  const set = <K extends keyof NaborInput>(key: K, value: NaborInput[K]) => {
    setForm({ ...form, [key]: value })
    setSaved(false)
  }
  const setField = (i: number, patch: Partial<NaborPole>) =>
    set('pola', form.pola.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const setCriterion = (i: number, patch: Partial<Kryterium>) =>
    set('kryteria', form.kryteria.map((k, j) => (j === i ? { ...k, ...patch } : k)))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setBusy(true)
    setError('')
    // Klucze pól powstają z etykiet (stałe po zapisie, żeby nie psuć istniejących wniosków)
    const used = new Set<string>()
    const pola = form.pola.map((p) => {
      let key = p.klucz || keyFromLabel(p.etykieta)
      while (used.has(key)) key = `${key}_2`
      used.add(key)
      return { ...p, klucz: key }
    })
    const body: NaborInput = {
      ...form, pola,
      organizator: form.organizator || null, opis: form.opis || null, url_zrodlowy: form.url_zrodlowy || null,
    }
    try {
      const result = isNew ? await kreator.createNabor(body) : await kreator.updateNabor(slug, body)
      setForm(result)
      setSaved(true)
      if (isNew) navigate(`/admin/nabory/${result.slug}`, { replace: true })
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <p><Link to="/admin/nabory">← Wszystkie nabory</Link></p>
      <h1>{isNew ? 'Nowy nabór' : 'Edycja naboru'}</h1>
      <form onSubmit={submit} className="stack" noValidate>
        <div className="grid-fields">
          <div className="field">
            <label htmlFor="n-nazwa">Nazwa naboru</label>
            <input id="n-nazwa" className="input" value={form.nazwa} onChange={(e) => set('nazwa', e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="n-org">Organizator</label>
            <input id="n-org" className="input" value={form.organizator ?? ''} onChange={(e) => set('organizator', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="n-od">Termin od</label>
            <input id="n-od" type="date" className="input" value={form.termin_od} onChange={(e) => set('termin_od', e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="n-do">Termin do (włącznie)</label>
            <input id="n-do" type="date" className="input" value={form.termin_do} onChange={(e) => set('termin_do', e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="n-opis">Opis naboru</label>
          <textarea id="n-opis" className="textarea" rows={3} value={form.opis ?? ''} onChange={(e) => set('opis', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="n-url">Adres strony naboru (źródło)</label>
          <input id="n-url" type="url" className="input" value={form.url_zrodlowy ?? ''} onChange={(e) => set('url_zrodlowy', e.target.value)} />
        </div>

        <fieldset className="field">
          <legend>Obszary, do których pasuje nabór</legend>
          <p className="hint">Służą do dopasowania naboru do pomysłu w „Znajdź finansowanie”.</p>
          <div className="grid-fields">
            {Object.entries(KATEGORIE).map(([k, label]) => (
              <label key={k} className="check">
                <input type="checkbox" checked={form.obszary.includes(k)}
                  onChange={(e) => set('obszary', e.target.checked ? [...form.obszary, k] : form.obszary.filter((x) => x !== k))} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="n-odb">Słowa kluczowe odbiorców (po przecinku)</label>
          <input id="n-odb" className="input" value={form.odbiorcy.join(', ')} aria-describedby="n-odb-hint"
            onChange={(e) => set('odbiorcy', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
          <p id="n-odb-hint" className="hint">Np. „senior, niepełnosprawn”. Gdy pomysł dotyczy takiej grupy, nabór zostanie pokazany jako pasujący.</p>
        </div>

        <h2>Pola wniosku</h2>
        {form.pola.map((p, i) => (
          <fieldset key={i} className="field">
            <legend>Pole {i + 1}</legend>
            <div className="grid-fields">
              <div className="field">
                <label htmlFor={`p-et-${i}`}>Nazwa pola</label>
                <input id={`p-et-${i}`} className="input" value={p.etykieta} onChange={(e) => setField(i, { etykieta: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor={`p-lim-${i}`}>Limit znaków</label>
                <input id={`p-lim-${i}`} type="number" min={50} max={10000} className="input" value={p.limit} onChange={(e) => setField(i, { limit: Number(e.target.value) })} />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`p-w-${i}`}>Wskazówka dla wnioskodawcy</label>
              <input id={`p-w-${i}`} className="input" value={p.wskazowka} onChange={(e) => setField(i, { wskazowka: e.target.value })} />
            </div>
            <fieldset className="field">
              <legend>Dane z fiszki, z których wolno wypełnić to pole</legend>
              <p className="hint">Bez zaznaczenia pole zawsze zostaje „do uzupełnienia” (np. budżet i wskaźniki).</p>
              <div className="grid-fields">
                {FISZKA_FIELDS.map((f) => (
                  <label key={f.value} className="check">
                    <input type="checkbox" checked={p.zrodla.includes(f.value)}
                      onChange={(e) => setField(i, { zrodla: e.target.checked ? [...p.zrodla, f.value] : p.zrodla.filter((x) => x !== f.value) })} />
                    {f.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {form.pola.length > 1 && (
              <div className="btn-row">
                <button type="button" className="btn btn-ghost" onClick={() => set('pola', form.pola.filter((_, j) => j !== i))}>Usuń pole {i + 1}</button>
              </div>
            )}
          </fieldset>
        ))}
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={() => set('pola', [...form.pola, { ...EMPTY_FIELD }])}>Dodaj pole wniosku</button>
        </div>

        <h2>Kryteria oceny</h2>
        {form.kryteria.map((k, i) => (
          <div key={i} className="grid-fields">
            <div className="field">
              <label htmlFor={`k-n-${i}`}>Kryterium {i + 1}</label>
              <input id={`k-n-${i}`} className="input" value={k.nazwa} onChange={(e) => setCriterion(i, { nazwa: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor={`k-o-${i}`}>Opis kryterium {i + 1}</label>
              <input id={`k-o-${i}`} className="input" value={k.opis} onChange={(e) => setCriterion(i, { opis: e.target.value })} />
            </div>
            <div className="field field-end">
              <button type="button" className="btn btn-ghost" onClick={() => set('kryteria', form.kryteria.filter((_, j) => j !== i))}>Usuń kryterium {i + 1}</button>
            </div>
          </div>
        ))}
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={() => set('kryteria', [...form.kryteria, { nazwa: '', opis: '' }])}>Dodaj kryterium</button>
        </div>

        {error && <ErrorBox message={error} />}
        {saved && <p role="status" className="alert alert-note">Nabór zapisany.</p>}
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Zapisywanie…' : 'Zapisz nabór'}</button>
        </div>
      </form>
    </>
  )
}
