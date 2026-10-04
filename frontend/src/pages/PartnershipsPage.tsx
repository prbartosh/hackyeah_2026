import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { errorText, formatDate, useLoad } from '@/admin/ui'
import {
  POWIATY, SEKTORY, TYPY, partnerships,
  type Oferta, type Sektor, type TypOgloszenia,
} from '@/api/partnerships'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import '@/styles/admin.css'

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Etykieta, pole i błąd pod polem, powiązane przez id. */
function Field({ id, label, hint, error, children }: {
  id: string; label: string; hint?: string; error?: string; children: (aria: Record<string, unknown>) => ReactNode
}) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error" role="alert">{error}</p>}
    </div>
  )
}

function OfferForm({ innowacja, onDone }: { innowacja: string; onDone: () => void }) {
  const [v, setV] = useState({
    typ: 'szukam_partnera' as TypOgloszenia, sektor: 'publiczny' as Sektor, instytucja: '', tytul: '',
    opis: '', powiat: 'm. Kraków', kontakt_email: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (v.instytucja.trim().length < 2) next.instytucja = 'Podaj nazwę instytucji lub grupy.'
    if (v.tytul.trim().length < 5) next.tytul = 'Tytuł ma mieć co najmniej 5 znaków.'
    if (v.opis.trim().length < 20) next.opis = 'Opisz ogłoszenie w co najmniej 20 znakach.'
    if (!EMAIL.test(v.kontakt_email.trim())) next.kontakt_email = 'Podaj poprawny adres e-mail.'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await partnerships.create({
        ...v, instytucja: v.instytucja.trim(), tytul: v.tytul.trim(), opis: v.opis.trim(),
        kontakt_email: v.kontakt_email.trim(), innowacja_slug: innowacja || undefined,
      })
      onDone()
    } catch (err) {
      setErrors({ form: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" onSubmit={submit} noValidate aria-labelledby="oferta-title">
      <h2 id="oferta-title">Dodaj ogłoszenie</h2>
      <Field id="of-typ" label="Rodzaj ogłoszenia">
        {(a) => <select {...a} className="select" value={v.typ} onChange={set('typ')}>
          {Object.entries(TYPY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>}
      </Field>
      <Field id="of-sektor" label="Sektor zgłaszającego">
        {(a) => <select {...a} className="select" value={v.sektor} onChange={set('sektor')}>
          {Object.entries(SEKTORY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>}
      </Field>
      <Field id="of-inst" label="Nazwa instytucji lub grupy" error={errors.instytucja}>
        {(a) => <input {...a} className="input" maxLength={200} value={v.instytucja} onChange={set('instytucja')} />}
      </Field>
      <Field id="of-tytul" label="Tytuł ogłoszenia" error={errors.tytul}>
        {(a) => <input {...a} className="input" maxLength={200} value={v.tytul} onChange={set('tytul')} />}
      </Field>
      <Field id="of-opis" label="Opis" hint="Czego szukasz albo co oferujesz. Do 2000 znaków." error={errors.opis}>
        {(a) => <textarea {...a} className="textarea" rows={5} maxLength={2000} value={v.opis} onChange={set('opis')} />}
      </Field>
      <Field id="of-powiat" label="Powiat">
        {(a) => <select {...a} className="select" value={v.powiat} onChange={set('powiat')}>
          {POWIATY.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>}
      </Field>
      <Field id="of-email" label="E-mail kontaktowy"
        hint="Nie pokazujemy go publicznie. Wiadomości przekaże Ci ROPS." error={errors.kontakt_email}>
        {(a) => <input {...a} className="input" type="email" autoComplete="email" maxLength={320}
          value={v.kontakt_email} onChange={set('kontakt_email')} />}
      </Field>
      {innowacja && <p className="hint">Ogłoszenie będzie powiązane z innowacją: {innowacja}.</p>}
      {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
      <p className="hint">Ogłoszenie pojawi się na liście po sprawdzeniu przez pracownika ROPS.</p>
      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Wysyłanie…' : 'Wyślij ogłoszenie'}</button>
      </div>
    </form>
  )
}

function ContactForm({ offer, onDone }: { offer: Oferta; onDone: () => void }) {
  const id = `ct-${offer.id}`
  const [v, setV] = useState({ nadawca_nazwa: '', nadawca_email: '', tresc: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (v.nadawca_nazwa.trim().length < 2) next.nadawca_nazwa = 'Podaj imię lub nazwę instytucji.'
    if (!EMAIL.test(v.nadawca_email.trim())) next.nadawca_email = 'Podaj poprawny adres e-mail.'
    if (v.tresc.trim().length < 10) next.tresc = 'Napisz co najmniej 10 znaków.'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await partnerships.contact(offer.id, {
        nadawca_nazwa: v.nadawca_nazwa.trim(), nadawca_email: v.nadawca_email.trim(), tresc: v.tresc.trim(),
      })
      onDone()
    } catch (err) {
      setErrors({ form: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-label={`Wiadomość do autora: ${offer.tytul}`}>
      <Field id={`${id}-nazwa`} label="Twoje imię lub nazwa instytucji" error={errors.nadawca_nazwa}>
        {(a) => <input {...a} className="input" maxLength={200} value={v.nadawca_nazwa} onChange={set('nadawca_nazwa')} />}
      </Field>
      <Field id={`${id}-email`} label="Twój e-mail" hint="Zobaczy go tylko ROPS, nie autor ogłoszenia." error={errors.nadawca_email}>
        {(a) => <input {...a} className="input" type="email" autoComplete="email" maxLength={320}
          value={v.nadawca_email} onChange={set('nadawca_email')} />}
      </Field>
      <Field id={`${id}-tresc`} label="Wiadomość" error={errors.tresc}>
        {(a) => <textarea {...a} className="textarea" rows={4} maxLength={2000} value={v.tresc} onChange={set('tresc')} />}
      </Field>
      {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Wysyłanie…' : 'Wyślij przez ROPS'}</button>
      </div>
    </form>
  )
}

function OfferCard({ offer, onSent }: { offer: Oferta; onSent: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  const formId = `kontakt-${offer.id}`
  return (
    <li className="panel">
      <p className="meta-line">
        <span className="tag tag-new">{TYPY[offer.typ]}</span>
        <span className="tag">{SEKTORY[offer.sektor]}</span>
        <span className="tag">Powiat: {offer.powiat}</span>
        {offer.syntetyczne && <span className="tag tag-synthetic">Przykładowe</span>}
        <span className="hint">{formatDate(offer.created_at)}</span>
      </p>
      <h2>{offer.tytul}</h2>
      <p><strong>{offer.instytucja}</strong></p>
      <p className="pre">{offer.opis}</p>
      {offer.innowacja_slug && (
        <p className="hint">Dotyczy innowacji: <Link to={`/innowacja/${offer.innowacja_slug}`}>{offer.innowacja_slug}</Link></p>
      )}
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" aria-expanded={open} aria-controls={formId}
          onClick={() => setOpen(!open)}>
          Napisz przez ROPS<span className="visually-hidden">: {offer.tytul}</span>
        </button>
      </div>
      {open && (
        <div id={formId}>
          <p className="hint">ROPS przekaże wiadomość autorowi. Adresy e-mail nie są ujawniane żadnej ze stron.</p>
          <ContactForm offer={offer} onDone={() => { setOpen(false); onSent(`Wiadomość do ogłoszenia „${offer.tytul}” trafiła do ROPS i zostanie przekazana autorowi.`) }} />
        </div>
      )}
    </li>
  )
}

/** Giełda partnerstw (moduł V): publiczne ogłoszenia po moderacji ROPS, kontakt przez ROPS. */
export default function PartnershipsPage() {
  useDocumentTitle('Giełda partnerstw · Splot')
  const [params, setParams] = useSearchParams()
  const innowacja = params.get('innowacja') ?? ''
  const [typ, setTyp] = useState('')
  const [sektor, setSektor] = useState('')
  const [powiat, setPowiat] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const { data, error, loading, reload } = useLoad(
    () => partnerships.list({ typ, sektor, powiat, innowacja }), [typ, sektor, powiat, innowacja],
  )
  useEffect(() => { if (showForm) document.getElementById('of-typ')?.focus() }, [showForm])

  return (
    <div className="container page">
      <h1>Giełda partnerstw</h1>
      <p className="lead">
        Szukasz partnera do wdrożenia innowacji albo możesz zaoferować wsparcie? Ogłoszenia sprawdza ROPS Kraków,
        a kontakt odbywa się przez ROPS, bez ujawniania adresów e-mail.
      </p>
      <div className="btn-row">
        <button type="button" className="btn btn-primary" aria-expanded={showForm} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Zamknij formularz' : 'Dodaj ogłoszenie'}
        </button>
      </div>
      <p role="status" className={notice ? 'alert alert-note' : undefined}>{notice}</p>
      {showForm && <OfferForm innowacja={innowacja} onDone={() => {
        setShowForm(false)
        setNotice('Dziękujemy. Ogłoszenie dotarło do ROPS i pojawi się na liście po sprawdzeniu.')
      }} />}

      <div className="filters">
        <div className="field">
          <label htmlFor="f-typ">Rodzaj</label>
          <select id="f-typ" className="select" value={typ} onChange={(e) => setTyp(e.target.value)}>
            <option value="">Wszystkie</option>
            {Object.entries(TYPY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-sektor">Sektor</label>
          <select id="f-sektor" className="select" value={sektor} onChange={(e) => setSektor(e.target.value)}>
            <option value="">Wszystkie</option>
            {Object.entries(SEKTORY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-powiat">Powiat</label>
          <select id="f-powiat" className="select" value={powiat} onChange={(e) => setPowiat(e.target.value)}>
            <option value="">Wszystkie</option>
            {POWIATY.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      {innowacja && (
        <p className="hint">
          Ogłoszenia powiązane z innowacją: {innowacja}.{' '}
          <button type="button" className="btn-link" onClick={() => setParams({})}>Pokaż wszystkie</button>
        </p>
      )}

      {error && (
        <p className="field-error" role="alert">{error} <button type="button" className="btn-link" onClick={reload}>Spróbuj ponownie</button></p>
      )}
      {loading && !data && <p role="status">Wczytywanie…</p>}
      {data && data.length === 0 && <p>Brak ogłoszeń dla wybranych filtrów. Dodaj pierwsze.</p>}
      {data && data.length > 0 && (
        <ul className="plain-list" aria-label="Ogłoszenia partnerskie">
          {data.map((o) => <OfferCard key={o.id} offer={o} onSent={setNotice} />)}
        </ul>
      )}
    </div>
  )
}
