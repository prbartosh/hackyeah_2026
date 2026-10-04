import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, MessagesSquare, Star } from 'lucide-react'
import { errorText } from '@/admin/ui'
import { OCENY, POZIOMY, opinions, type OpinieSummary, type RodzajOpinii } from '@/api/opinions'
import { plural } from '@/lib/plural'
import '@/styles/admin.css'
import '@/styles/tester.css'

function Stars({ value }: { value: number }) {
  return (
    <span className="stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={18} className={n <= value ? 'star-on' : 'star-off'} />
      ))}
    </span>
  )
}

const TEXTS: Record<RodzajOpinii, { title: string; tresc: string; trescHint: string; usprawnienie: string; submit: string }> = {
  ocena: {
    title: 'Oceń rozwiązanie',
    tresc: 'Co działa, a co nie?',
    trescHint: 'Napisz, jak rozwiązanie sprawdziło się u Was. Co najmniej 10 znaków.',
    usprawnienie: 'Co można usprawnić? (nieobowiązkowo)',
    submit: 'Wyślij ocenę',
  },
  test: {
    title: 'Chcę przetestować',
    tresc: 'Dlaczego chcesz przetestować to rozwiązanie?',
    trescHint: 'Np. u ilu osób i przez jaki czas. Co najmniej 10 znaków.',
    usprawnienie: 'Co chcesz sprawdzić albo zmienić? (nieobowiązkowo)',
    submit: 'Zgłoś się do testów',
  },
}

function OpinionForm({ slug, rodzaj, onDone }: { slug: string; rodzaj: RodzajOpinii; onDone: (token: string | null) => void }) {
  const t = TEXTS[rodzaj]
  const id = `op-${rodzaj}`
  const [ocena, setOcena] = useState<number | null>(null)
  const [instytucja, setInstytucja] = useState('')
  const [tresc, setTresc] = useState('')
  const [usprawnienie, setUsprawnienie] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ ocena?: string; tresc?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (rodzaj === 'ocena' && !ocena) next.ocena = 'Wybierz ocenę od 1 do 5.'
    if (tresc.trim().length < 10) next.tresc = 'Napisz kilka słów (co najmniej 10 znaków).'
    setErrors(next)
    if (next.ocena || next.tresc) return
    setBusy(true)
    try {
      const r = await opinions.create(slug, {
        rodzaj,
        ocena: rodzaj === 'ocena' ? (ocena ?? undefined) : undefined,
        instytucja: instytucja.trim() || undefined,
        tresc: tresc.trim(),
        usprawnienie: usprawnienie.trim() || undefined,
        autor_email: rodzaj === 'test' ? email.trim() || undefined : undefined,
      })
      onDone(r.token_watku)
    } catch (err) {
      setErrors({ form: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="opinion-form" onSubmit={submit} noValidate aria-labelledby={`${id}-title`} data-tour={`tester-formularz-${rodzaj}`}>
      <h3 id={`${id}-title`}>{t.title}</h3>
      {rodzaj === 'ocena' && (
        <fieldset className="rating-field" aria-describedby={errors.ocena ? `${id}-ocena-error` : undefined}>
          <legend>Jak oceniasz to rozwiązanie?</legend>
          <div className="rating-options">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="rating-option">
                <input type="radio" name={`${id}-ocena`} value={n} checked={ocena === n} onChange={() => setOcena(n)} />
                <Stars value={n} />
                <span>{n}: {OCENY[n]}</span>
              </label>
            ))}
          </div>
          {errors.ocena && <p id={`${id}-ocena-error`} className="field-error" role="alert">{errors.ocena}</p>}
        </fieldset>
      )}
      <label htmlFor={`${id}-inst`}>Jaka to instytucja? (nieobowiązkowo)</label>
      <input id={`${id}-inst`} className="input" value={instytucja} maxLength={200} data-tour={`tester-${rodzaj}-instytucja`}
        onChange={(e) => setInstytucja(e.target.value)} aria-describedby={`${id}-inst-hint`} />
      <p id={`${id}-inst-hint`} className="hint">Np. „OPS w gminie wiejskiej”. Bez nazwisk.</p>

      <label htmlFor={`${id}-tresc`}>{t.tresc}</label>
      <textarea id={`${id}-tresc`} className="textarea" rows={4} maxLength={2000} value={tresc} data-tour={`tester-${rodzaj}-tresc`}
        onChange={(e) => setTresc(e.target.value)} aria-invalid={errors.tresc ? true : undefined}
        aria-describedby={`${id}-tresc-hint${errors.tresc ? ` ${id}-tresc-error` : ''}`} />
      <p id={`${id}-tresc-hint`} className="hint">{t.trescHint}</p>
      {errors.tresc && <p id={`${id}-tresc-error`} className="field-error" role="alert">{errors.tresc}</p>}

      <label htmlFor={`${id}-usp`}>{t.usprawnienie}</label>
      <textarea id={`${id}-usp`} className="textarea" rows={3} maxLength={2000} value={usprawnienie} data-tour={`tester-${rodzaj}-usprawnienie`}
        onChange={(e) => setUsprawnienie(e.target.value)} />

      {rodzaj === 'test' && (
        <>
          <label htmlFor={`${id}-email`}>E-mail do kontaktu (nieobowiązkowo)</label>
          <input id={`${id}-email`} className="input" type="email" autoComplete="email" value={email} data-tour="tester-test-email"
            onChange={(e) => setEmail(e.target.value)} />
        </>
      )}
      {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
      <p className="hint">Opinię zobaczą inni po sprawdzeniu przez pracownika ROPS.</p>
      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={busy} data-tour={`tester-${rodzaj}-wyslij`}>{busy ? 'Wysyłanie…' : t.submit}</button>
      </div>
    </form>
  )
}

/** „Zapytaj instytucję, która to testuje” (moduł V): pytanie idzie przez ROPS, bez ujawniania kontaktów. */
function AskTesters({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)
  const [tresc, setTresc] = useState('')
  const [instytucja, setInstytucja] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const sentRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (token) sentRef.current?.focus() }, [token])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (tresc.trim().length < 10) {
      setError('Napisz pytanie (co najmniej 10 znaków).')
      return
    }
    setBusy(true)
    setError('')
    try {
      const r = await opinions.ask(slug, {
        tresc: tresc.trim(),
        instytucja: instytucja.trim() || undefined,
        autor_email: email.trim() || undefined,
      })
      setToken(r.token_watku)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (token) {
    return (
      <div className="alert alert-note tester-sent" role="status" tabIndex={-1} ref={sentRef} data-tour="tester-pytanie-wyslano">
        <p><strong>Pytanie dotarło do ROPS.</strong> Pracownik przekaże je instytucji, która testuje to rozwiązanie, a odpowiedź pojawi się tutaj:</p>
        <p><Link to={`/watek/${token}`}>{window.location.origin}/watek/{token}</Link></p>
      </div>
    )
  }

  return (
    <div className="tester-ask" data-tour="tester-zapytaj">
      <button type="button" className={`btn ${open ? 'btn-primary' : 'btn-secondary'}`}
        aria-expanded={open} aria-controls="ask-form-slot" onClick={() => setOpen(!open)} data-tour="tester-zapytaj-przycisk">
        <MessagesSquare size={18} aria-hidden="true" />
        Zapytaj instytucję, która to testuje
      </button>
      <div id="ask-form-slot">
        {open && (
          <form className="opinion-form" onSubmit={submit} noValidate aria-labelledby="ask-title" data-tour="tester-pytanie-formularz">
            <h3 id="ask-title">Zapytaj instytucję, która to testuje</h3>
            <p className="hint">Pytanie trafi do pracownika ROPS. On przekaże je dalej. Nie zobaczysz danych kontaktowych instytucji, a ona nie zobaczy Twoich.</p>
            <label htmlFor="ask-tresc">Twoje pytanie</label>
            <textarea id="ask-tresc" className="textarea" rows={4} maxLength={2000} value={tresc} data-tour="tester-pytanie-tresc"
              onChange={(e) => setTresc(e.target.value)} aria-invalid={error ? true : undefined}
              aria-describedby="ask-tresc-hint ask-error" />
            <p id="ask-tresc-hint" className="hint">Np. ile trwało wdrożenie, co było najtrudniejsze, ile kosztowało.</p>
            <label htmlFor="ask-inst">Jaka to instytucja? (nieobowiązkowo)</label>
            <input id="ask-inst" className="input" value={instytucja} maxLength={200} data-tour="tester-pytanie-instytucja" onChange={(e) => setInstytucja(e.target.value)} />
            <label htmlFor="ask-email">E-mail do powiadomienia o odpowiedzi (nieobowiązkowo)</label>
            <input id="ask-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <p id="ask-error" className="field-error" role="alert">{error}</p>
            <div className="btn-row">
              <button type="submit" className="btn btn-primary" disabled={busy} data-tour="tester-pytanie-wyslij">{busy ? 'Wysyłanie…' : 'Wyślij pytanie'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/** Tester innowacji (moduł IV): poziom dowodu, oceny i zgłoszenia do testów zatwierdzone przez ROPS. */
export default function TesterSection({ slug }: { slug: string }) {
  const [data, setData] = useState<OpinieSummary | null>(null)
  const [loadError, setLoadError] = useState('')
  const [open, setOpen] = useState<RodzajOpinii | null>(null)
  const [sent, setSent] = useState<{ rodzaj: RodzajOpinii; token: string | null } | null>(null)
  const sentRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    setLoadError('')
    opinions.summary(slug).then(setData).catch((e) => setLoadError(errorText(e)))
  }, [slug])

  useEffect(load, [load])
  useEffect(() => { if (sent) sentRef.current?.focus() }, [sent])

  const current = data ? POZIOMY.findIndex((p) => p.kod === data.poziom.kod) : -1

  return (
    <section className="detail-section tester" aria-labelledby="tester-title" data-tour="tester-sekcja">
      <h2 id="tester-title">Oceny i testy</h2>
      {loadError && (
        <p className="hint">{loadError} <button type="button" className="btn-link" onClick={load}>Spróbuj ponownie</button></p>
      )}
      {data && (
        <>
          <ol className="evidence-steps" aria-label="Poziom dowodu" data-tour="tester-poziom">
            {POZIOMY.map((p, i) => (
              <li key={p.kod} className={i <= current ? 'is-reached' : ''} aria-current={i === current ? 'step' : undefined}>
                <span className="step-dot" aria-hidden="true">{i + 1}</span>
                {p.etykieta}
                {i === current && <span className="visually-hidden"> (obecny poziom)</span>}
              </li>
            ))}
          </ol>
          <p><strong>Poziom dowodu: {data.poziom.etykieta}.</strong> {data.poziom.opis}</p>
          <p className="tester-stats">
            {data.srednia !== null ? (
              <><Stars value={Math.round(data.srednia)} /> Średnia ocena: <strong>{data.srednia.toLocaleString('pl-PL')} z 5</strong> ({plural(data.liczba_ocen, 'ocena', 'oceny', 'ocen')})</>
            ) : 'Nikt jeszcze nie ocenił tego rozwiązania.'}
            {data.liczba_testow > 0 && <> · W testach: {plural(data.liczba_testow, 'instytucja', 'instytucje', 'instytucji')}</>}
          </p>

          {data.opinie.length > 0 && (
            <ul className="opinion-list" data-tour="tester-opinie">
              {data.opinie.map((o, i) => (
                <li key={i} className="opinion">
                  <p className="opinion-head">
                    {o.rodzaj === 'ocena' && o.ocena ? (
                      <><Stars value={o.ocena} /><span className="visually-hidden">Ocena {o.ocena} z 5.</span></>
                    ) : (
                      <span className="tag"><FlaskConical size={14} aria-hidden="true" /> Zgłoszenie do testów</span>
                    )}
                    <span className="opinion-who">{o.instytucja ?? 'Instytucja bez nazwy'}</span>
                    {o.syntetyczna && <span className="tag tag-synthetic">Dane demo</span>}
                  </p>
                  <p>{o.tresc}</p>
                  {o.usprawnienie && (
                    <p className="hint">
                      <strong>{o.rodzaj === 'test' ? 'Co chcą sprawdzić:' : 'Propozycja usprawnienia:'}</strong> {o.usprawnienie}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {sent ? (
        <div className="alert alert-note tester-sent" role="status" tabIndex={-1} ref={sentRef} data-tour="tester-potwierdzenie">
          {sent.rodzaj === 'test' ? (
            <>
              <p><strong>Dziękujemy, zgłoszenie do testów dotarło do ROPS.</strong> Pracownik odpowie pod tym adresem:</p>
              {sent.token && <p><Link to={`/watek/${sent.token}`}>{window.location.origin}/watek/{sent.token}</Link></p>}
            </>
          ) : (
            <p><strong>Dziękujemy za ocenę.</strong> Pojawi się tutaj po sprawdzeniu przez pracownika ROPS.</p>
          )}
        </div>
      ) : (
        <>
          <div className="btn-row tester-actions" data-tour="tester-akcje">
            {(['test', 'ocena'] as RodzajOpinii[]).map((r) => (
              <button key={r} type="button" className={`btn ${open === r ? 'btn-primary' : 'btn-secondary'}`}
                aria-expanded={open === r} aria-controls="opinion-form-slot"
                onClick={() => setOpen(open === r ? null : r)} data-tour={`tester-przycisk-${r}`}>
                {r === 'test' ? <FlaskConical size={18} aria-hidden="true" /> : <Star size={18} aria-hidden="true" />}
                {TEXTS[r].title}
              </button>
            ))}
          </div>
          <div id="opinion-form-slot">
            {open && <OpinionForm key={open} slug={slug} rodzaj={open} onDone={(token) => { setSent({ rodzaj: open, token }); setOpen(null) }} />}
          </div>
        </>
      )}
      {data?.mozna_zapytac && <AskTesters slug={slug} />}
    </section>
  )
}
