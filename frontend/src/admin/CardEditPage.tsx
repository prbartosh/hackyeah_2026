import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '@/admin/api'
import {
  CardStatusBadge, COST_LABELS, ErrorBox, EVIDENCE_LABELS, Loading, TIME_LABELS, errorText, useLoad, useTitle,
} from '@/admin/ui'
import type { Card, CardInput } from '@/admin/types'
import { KATEGORIE, type Innowacja } from '@/types/innowacja'

interface FormState {
  nazwa: string
  status: string
  kategoria: string
  poziom_dowodu: string
  problem: string
  grupa_docelowa: string
  kto_moze_skorzystac: string
  opis: string
  czy_dziala: string
  organizacja: string
  licencja: string
  wybrana: boolean
  koszt: string
  czas: string
  zasoby: string
  uwagi: string
}

function toForm(card: Card | null): FormState {
  return {
    nazwa: card?.nazwa ?? '',
    status: card?.status ?? 'szkic',
    kategoria: card?.kategorie[0] ?? '',
    poziom_dowodu: card?.poziom_dowodu ?? '',
    problem: card?.problem ?? '',
    grupa_docelowa: card?.grupa_docelowa ?? '',
    kto_moze_skorzystac: card?.kto_moze_skorzystac ?? '',
    opis: card?.opis ?? '',
    czy_dziala: card?.czy_dziala ?? '',
    organizacja: card?.organizacja ?? '',
    licencja: card?.licencja ?? '',
    wybrana: card?.wybrana_do_upowszechniania ?? false,
    koszt: card?.wdrozenie?.poziom_kosztu ?? '',
    czas: card?.wdrozenie?.czas_startu ?? '',
    zasoby: (card?.wdrozenie?.wymagane_zasoby ?? []).join('\n'),
    uwagi: card?.wdrozenie?.uwagi ?? '',
  }
}

function toInput(f: FormState): CardInput & { nazwa: string } {
  const text = (v: string) => (v.trim() ? v.trim() : null)
  const resources = f.zasoby.split('\n').map((s) => s.trim()).filter(Boolean)
  return {
    nazwa: f.nazwa.trim(),
    status: f.status as Card['status'],
    kategorie: f.kategoria ? [f.kategoria] : [],
    poziom_dowodu: (f.poziom_dowodu || null) as Card['poziom_dowodu'],
    problem: text(f.problem),
    grupa_docelowa: text(f.grupa_docelowa),
    kto_moze_skorzystac: text(f.kto_moze_skorzystac),
    opis: text(f.opis),
    czy_dziala: text(f.czy_dziala),
    organizacja: text(f.organizacja),
    licencja: text(f.licencja),
    wybrana_do_upowszechniania: f.wybrana,
    wdrozenie: {
      poziom_kosztu: (f.koszt || null) as never,
      czas_startu: (f.czas || null) as never,
      wymagane_zasoby: resources,
      uwagi: text(f.uwagi),
    },
  }
}

function Preview({ slug, version }: { slug: string; version: number }) {
  const { data, error, loading } = useLoad<Innowacja>(() => api.cardPreview(slug), [slug, version])
  return (
    <section aria-labelledby="preview-h" className="panel preview">
      <h2 id="preview-h">Podgląd: tak zobaczy to użytkownik</h2>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} />}
      {data && (
        <article>
          <p className="detail-kicker">{data.kategorie[0] ? (KATEGORIE[data.kategorie[0]] ?? data.kategorie[0]) : 'Bez kategorii'}</p>
          <h3>{data.nazwa}</h3>
          {([
            ['Problem, który rozwiązuje', data.problem],
            ['Dla kogo', data.grupa_docelowa],
            ['Kto może wdrożyć', data.kto_moze_skorzystac],
            ['Czy to działa', data.czy_dziala],
            ['Na czym polega', data.opis],
          ] as const).map(([title, text]) => (
            <section key={title} className="detail-section">
              <h4>{title}</h4>
              <p>{text ?? <span className="empty">Brak danych w bazie.</span>}</p>
            </section>
          ))}
          <p className="hint">Organizacja: {data.organizacja ?? 'brak danych'} · Licencja: {data.licencja ?? 'brak danych'}</p>
        </article>
      )}
    </section>
  )
}

export default function CardEditPage() {
  const { slug = '' } = useParams()
  const isNew = slug === 'nowa'
  const navigate = useNavigate()
  useTitle(isNew ? 'Nowa karta' : 'Edycja karty')
  const { data, error, loading, reload } = useLoad<Card | null>(
    () => (isNew ? Promise.resolve(null) : api.card(slug)),
    [slug],
  )
  const [form, setForm] = useState<FormState>(toForm(null))
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [notice, setNotice] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (data !== undefined) setForm(toForm(data))
  }, [data])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  async function save(e: FormEvent) {
    e.preventDefault()
    setFailure('')
    setNotice('')
    if (!form.nazwa.trim()) {
      setFailure('Wpisz nazwę karty.')
      return
    }
    setBusy(true)
    try {
      const input = toInput(form)
      const saved = isNew ? await api.createCard(input) : await api.updateCard(slug, input)
      setNotice(`Zapisano.${saved.ostrzezenie ? ` ${saved.ostrzezenie}` : ''}`)
      setVersion((v) => v + 1)
      if (isNew) navigate(`/admin/karty/${saved.slug}`, { replace: true })
      else reload()
    } catch (err) {
      setFailure(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading && data === undefined) return <Loading text="Wczytywanie karty…" />
  if (error) return <><h1>Karta innowacji</h1><ErrorBox message={error} onRetry={reload} /></>

  const field = (id: string, label: string, key: keyof FormState, rows = 3, hint?: string) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
      <textarea id={id} className="textarea" rows={rows} value={form[key] as string}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => set(key, e.target.value as never)} />
    </div>
  )

  return (
    <>
      <p><Link to="/admin/karty">← Wróć do listy kart</Link></p>
      <h1>{isNew ? 'Nowa karta innowacji' : form.nazwa || 'Karta innowacji'} {data && <CardStatusBadge status={data.status} />}</h1>

      <div className="edit-layout">
        <form onSubmit={save} className="stack" noValidate>
          <div className="field">
            <label htmlFor="c-nazwa">Nazwa</label>
            <input id="c-nazwa" className="input" value={form.nazwa} onChange={(e) => set('nazwa', e.target.value)}
              required aria-invalid={failure && !form.nazwa.trim() ? true : undefined} />
          </div>
          <div className="grid-fields">
            <div className="field">
              <label htmlFor="c-status">Status</label>
              <select id="c-status" className="select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="szkic">Szkic (niewidoczna dla użytkowników)</option>
                <option value="opublikowana">Opublikowana (widoczna w wyszukiwarce)</option>
                <option value="zarchiwizowana">Zarchiwizowana (ukryta)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="c-kat">Obszar społeczny</label>
              <select id="c-kat" className="select" value={form.kategoria} onChange={(e) => set('kategoria', e.target.value)}>
                <option value="">Nie wybrano</option>
                {Object.entries(KATEGORIE).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="c-dowod">Poziom dowodu skuteczności</label>
              <select id="c-dowod" className="select" value={form.poziom_dowodu} onChange={(e) => set('poziom_dowodu', e.target.value)}>
                <option value="">Nie określono</option>
                {Object.entries(EVIDENCE_LABELS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
            </div>
          </div>
          {field('c-problem', 'Problem, który rozwiązuje', 'problem', 3)}
          {field('c-grupa', 'Dla kogo (odbiorcy)', 'grupa_docelowa', 2)}
          {field('c-kto', 'Kto może wdrożyć', 'kto_moze_skorzystac', 2)}
          {field('c-opis', 'Na czym polega', 'opis', 6)}
          {field('c-dziala', 'Dowody skuteczności', 'czy_dziala', 3)}
          <div className="grid-fields">
            <div className="field">
              <label htmlFor="c-org">Organizacja (bez imion i nazwisk osób)</label>
              <input id="c-org" className="input" value={form.organizacja} onChange={(e) => set('organizacja', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="c-lic">Licencja</label>
              <input id="c-lic" className="input" value={form.licencja} onChange={(e) => set('licencja', e.target.value)} />
            </div>
          </div>
          <fieldset className="field">
            <legend>Wdrożenie dla instytucji</legend>
            <p className="hint">Zostaw puste, jeśli nie ma danych. Nie zgadujemy.</p>
            <div className="grid-fields">
              <div className="field">
                <label htmlFor="c-koszt">Koszt wdrożenia</label>
                <select id="c-koszt" className="select" value={form.koszt} onChange={(e) => set('koszt', e.target.value)}>
                  <option value="">Brak danych</option>
                  {Object.entries(COST_LABELS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="c-czas">Czas do uruchomienia</label>
                <select id="c-czas" className="select" value={form.czas} onChange={(e) => set('czas', e.target.value)}>
                  <option value="">Brak danych</option>
                  {Object.entries(TIME_LABELS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </select>
              </div>
            </div>
            {field('c-zasoby', 'Wymagania wdrożenia (jedno w wierszu)', 'zasoby', 3)}
            {field('c-uwagi', 'Uwagi o wdrożeniu', 'uwagi', 2)}
          </fieldset>
          <label className="check">
            <input type="checkbox" checked={form.wybrana} onChange={(e) => set('wybrana', e.target.checked)} />
            Wyróżniona przez ROPS do upowszechniania
          </label>

          {failure && <p className="field-error" role="alert">{failure}</p>}
          {notice && <p className="status-ok" role="status">{notice}</p>}
          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Zapisywanie…' : 'Zapisz kartę'}</button>
          </div>
        </form>
        {!isNew && <Preview slug={slug} version={version} />}
      </div>
    </>
  )
}
