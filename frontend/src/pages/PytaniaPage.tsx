import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { errorText, formatDate, useLoad } from '@/admin/ui'
import { pytania } from '@/api/pytania'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { KATEGORIE } from '@/types/innowacja'
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

function AskForm({ onDone }: { onDone: () => void }) {
  const [v, setV] = useState({ tresc: '', kategoria: '', autor_nazwa: '', autor_email: '' })
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (v.tresc.trim().length < 10) next.tresc = 'Napisz pytanie w co najmniej 10 znakach.'
    if (v.autor_email.trim() && !EMAIL.test(v.autor_email.trim())) next.autor_email = 'Podaj poprawny adres e-mail.'
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await pytania.create({
        tresc: v.tresc.trim(),
        kategoria: v.kategoria || undefined,
        autor_nazwa: v.autor_nazwa.trim() || undefined,
        autor_email: v.autor_email.trim() || undefined,
        zgoda_na_publikacje: consent,
      })
      onDone()
    } catch (err) {
      setErrors({ form: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" data-tour="siec-pytania-form" onSubmit={submit} noValidate aria-labelledby="ask-title">
      <h2 id="ask-title">Zadaj pytanie</h2>
      <Field id="py-tresc" label="Twoje pytanie" hint="Do 2000 znaków." error={errors.tresc}>
        {(a) => <textarea {...a} data-tour="siec-pytania-tresc" className="textarea" rows={4} maxLength={2000} value={v.tresc} onChange={set('tresc')} />}
      </Field>
      <Field id="py-kategoria" label="Obszar (opcjonalnie)">
        {(a) => <select {...a} className="select" value={v.kategoria} onChange={set('kategoria')}>
          <option value="">Bez wyboru</option>
          {Object.entries(KATEGORIE).map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
        </select>}
      </Field>
      <Field id="py-nazwa" label="Imię lub nazwa (opcjonalnie)">
        {(a) => <input {...a} className="input" maxLength={200} autoComplete="name" value={v.autor_nazwa} onChange={set('autor_nazwa')} />}
      </Field>
      <Field id="py-email" label="E-mail (opcjonalnie)"
        hint="Jeśli go podasz, wyślemy tam odpowiedź. Nigdy nie jest publiczny." error={errors.autor_email}>
        {(a) => <input {...a} className="input" type="email" autoComplete="email" maxLength={320}
          value={v.autor_email} onChange={set('autor_email')} />}
      </Field>
      <div className="field">
        <label>
          <input type="checkbox" data-tour="siec-pytania-zgoda" checked={consent} aria-describedby="py-consent-hint"
            onChange={(e) => setConsent(e.target.checked)} />{' '}
          Zgadzam się, żeby ROPS mógł opublikować moje pytanie wraz z odpowiedzią
        </label>
        <p id="py-consent-hint" className="hint">
          Pytanie pokażemy anonimowo, bez imienia i e-maila, żeby inni też mogli skorzystać z odpowiedzi.
          Bez zgody pytanie zostaje prywatne, a pracownik ROPS i tak na nie odpowie.
        </p>
      </div>
      {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
      <div className="btn-row">
        <button type="submit" data-tour="siec-pytania-wyslij" className="btn btn-primary" disabled={busy}>{busy ? 'Wysyłanie…' : 'Wyślij pytanie'}</button>
      </div>
    </form>
  )
}

/** Publiczne FAQ: opublikowane pytania z odpowiedziami ROPS i formularz „Zadaj pytanie”. */
export default function PytaniaPage() {
  useDocumentTitle('Pytania do ROPS · Splot')
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [kategoria, setKategoria] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const { data, error, loading, reload } = useLoad(() => pytania.list(q, kategoria), [q, kategoria])
  useEffect(() => {
    const timer = setTimeout(() => setQ(input), 300)
    return () => clearTimeout(timer)
  }, [input])
  useEffect(() => { if (showForm) document.getElementById('py-tresc')?.focus() }, [showForm])

  return (
    <div className="container page">
      <h1>Pytania do ROPS</h1>
      <p className="lead">
        Odpowiedzi ROPS Kraków na pytania użytkowników. Nie znalazłeś swojej odpowiedzi? Zadaj pytanie. Jeśli
        potrzebujesz pomocy w konkretnej, prywatnej sprawie, użyj raczej zgłoszenia potrzeby.
      </p>
      <div className="btn-row">
        <button type="button" data-tour="siec-pytania-zadaj" className="btn btn-primary" aria-expanded={showForm} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Zamknij formularz' : 'Zadaj pytanie'}
        </button>
      </div>
      <p role="status" data-tour={notice ? 'siec-pytania-status' : undefined} className={notice ? 'alert alert-note' : undefined}>{notice}</p>
      {showForm && <AskForm onDone={() => {
        setShowForm(false)
        setNotice('Dziękujemy, pytanie dotarło do ROPS. Jeśli podałeś e-mail, wyślemy tam odpowiedź.')
      }} />}

      <div className="filters">
        <div className="field">
          <label htmlFor="pq-q">Szukaj w pytaniach</label>
          <input id="pq-q" type="search" className="input" value={input} onChange={(e) => setInput(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pq-kat">Obszar</label>
          <select id="pq-kat" className="select" value={kategoria} onChange={(e) => setKategoria(e.target.value)}>
            <option value="">Wszystkie</option>
            {Object.entries(KATEGORIE).map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <p className="field-error" role="alert">{error} <button type="button" className="btn-link" onClick={reload}>Spróbuj ponownie</button></p>
      )}
      {loading && !data && <p role="status">Wczytywanie…</p>}
      {data && data.length === 0 && <p>Brak opublikowanych pytań dla tego wyszukiwania. Zadaj własne.</p>}
      {data && data.length > 0 && (
        <ul className="plain-list" aria-label="Pytania i odpowiedzi">
          {data.map((p, i) => (
            <li key={p.id} className="panel" data-tour={i === 0 ? 'siec-pytania-lista' : undefined}>
              <details>
                <summary><strong>{p.tresc}</strong></summary>
                <p className="meta-line">
                  <span className="tag">Odpowiedź ROPS</span>
                  {p.kategoria && <span className="tag">{KATEGORIE[p.kategoria] ?? p.kategoria}</span>}
                  {p.syntetyczne && <span className="tag tag-synthetic">Przykładowe</span>}
                  <span className="hint">{formatDate(p.odpowiedziano)}</span>
                </p>
                <p className="pre">{p.odpowiedz}</p>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
