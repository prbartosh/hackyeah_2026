import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { ErrorBox, Loading, errorText } from '@/admin/ui'
import VoiceButton from '@/components/VoiceButton'
import { kreator } from '@/kreator/api'
import {
  AiTag, AssistantPanel, LimitedTextarea, SaveStatus, SimilarInnovations, StepProgress,
} from '@/kreator/components'
import { ETAPY, etapLabel } from '@/kreator/helpers'
import { rememberDraft } from '@/kreator/storage'
import type { Etap, Fiszka, PoleFiszki } from '@/kreator/types'
import { useAutosave } from '@/kreator/useAutosave'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { KATEGORIE } from '@/types/innowacja'

interface Form {
  opis_wlasny: string
  istota: string
  odbiorca: string
  etap: Etap | ''
  obszar: string
  lokalizacja: string
  potrzeby: string
  pola_ai: PoleFiszki[]
}

const EMPTY: Form = { opis_wlasny: '', istota: '', odbiorca: '', etap: '', obszar: '', lokalizacja: '', potrzeby: '', pola_ai: [] }
const STEPS = ['Opisz pomysł', 'Na czym polega', 'Dla kogo', 'Etap realizacji', 'Dodatkowe informacje', 'Podgląd i wysłanie']
const [S_OPIS, S_ISTOTA, S_ODBIORCA, S_ETAP, S_DODATKOWE, S_PODGLAD] = [0, 1, 2, 3, 4, 5]

function fromFiszka(f: Fiszka): Form {
  return {
    opis_wlasny: f.opis_wlasny ?? '', istota: f.istota ?? '', odbiorca: f.odbiorca ?? '', etap: f.etap ?? '',
    obszar: f.obszar ?? '', lokalizacja: f.lokalizacja ?? '', potrzeby: f.potrzeby ?? '', pola_ai: f.pola_ai as PoleFiszki[],
  }
}

function payload(form: Form) {
  return {
    opis_wlasny: form.opis_wlasny || null, istota: form.istota || null, odbiorca: form.odbiorca || null,
    etap: form.etap || null, obszar: form.obszar || null, lokalizacja: form.lokalizacja || null,
    potrzeby: form.potrzeby || null, pola_ai: form.pola_ai,
  }
}

const isEmpty = (form: Form) => Object.entries(form).every(([k, v]) => k === 'pola_ai' || !v)

/** Krokowa fiszka pomysłu: jeden temat na ekran, autozapis szkicu, podgląd i wysłanie do skrzynki ROPS. */
export default function FiszkaPage() {
  const { token: urlToken } = useParams()
  const navigate = useNavigate()
  useDocumentTitle('Fiszka pomysłu · Kreator pomysłów · Splot')

  const [form, setForm] = useState<Form>(EMPTY)
  const [token, setToken] = useState<string | null>(urlToken ?? null)
  const [fiszka, setFiszka] = useState<Fiszka | null>(null)
  const [loading, setLoading] = useState(Boolean(urlToken))
  const [loadError, setLoadError] = useState('')
  const [step, setStep] = useState(S_OPIS)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [aiBusy, setAiBusy] = useState(false)
  const [aiNote, setAiNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [sendBusy, setSendBusy] = useState(false)
  const [sendError, setSendError] = useState('')
  const [author, setAuthor] = useState({ name: '', email: '' })
  const heading = useRef<HTMLHeadingElement>(null)
  const formRef = useRef(form)
  const tokenRef = useRef(token)
  const loadedFor = useRef<string | null>(null)

  useEffect(() => {
    formRef.current = form
    tokenRef.current = token
  })

  const persist = useCallback(async () => {
    const current = formRef.current
    if (isEmpty(current) && !tokenRef.current) return
    let saved: Fiszka
    if (!tokenRef.current) {
      saved = await kreator.createFiszka(payload(current))
      tokenRef.current = saved.token
      loadedFor.current = saved.token
      setToken(saved.token)
      navigate(`/kreator/fiszka/${saved.token}`, { replace: true })
    } else {
      saved = await kreator.saveFiszka(tokenRef.current, payload(current))
    }
    rememberDraft({ typ: 'fiszka', token: saved.token, tytul: current.istota.slice(0, 70) || 'Fiszka bez tytułu' })
  }, [navigate])

  const autosave = useAutosave(persist)

  // Powrót do niedokończonej fiszki z adresu (obsługa też zmiany adresu po pierwszym zapisie)
  useEffect(() => {
    if (!urlToken || loadedFor.current === urlToken) return
    loadedFor.current = urlToken
    let cancelled = false
    setLoading(true)
    kreator.fiszka(urlToken)
      .then((f) => {
        if (cancelled) return
        setFiszka(f)
        setForm(fromFiszka(f))
        setToken(f.token)
        setStep(f.istota ? S_ISTOTA : S_OPIS)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setLoadError(errorText(e))
        setLoading(false)
      })
    return () => {
      cancelled = true
      // StrictMode (dev) uruchamia efekt dwa razy; bez tego drugie wczytanie by pominięto
      if (loadedFor.current === urlToken) loadedFor.current = null
    }
  }, [urlToken])

  const goTo = (next: number) => {
    setErrors({})
    setStep(next)
    window.setTimeout(() => heading.current?.focus(), 0)
  }

  const change = (field: keyof Omit<Form, 'pola_ai'>, value: string) => {
    setForm((f) => ({
      ...f,
      [field]: value,
      // Edycja pola wypełnionego przez AI zdejmuje oznaczenie: to już tekst użytkownika
      pola_ai: f.pola_ai.filter((p) => p !== field),
    }))
    setErrors((e) => ({ ...e, [field]: undefined }))
    autosave.schedule()
  }

  function validate(forStep: number): boolean {
    const next: Record<string, string> = {}
    if (forStep === S_ISTOTA && form.istota.trim().length < 10) {
      next.istota = 'Opisz pomysł w kilku słowach (co najmniej 10 znaków), np. „Mobilny punkt porad dla seniorów na wsi”.'
    }
    if (forStep === S_ODBIORCA && form.odbiorca.trim().length < 3) {
      next.odbiorca = 'Napisz, dla kogo jest ten pomysł, np. „samotni seniorzy w gminie”.'
    }
    if (forStep === S_ETAP && !form.etap) {
      next.etap = 'Wybierz jeden z etapów. Jeśli nie wiesz, wybierz „Pomysł”.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const next = () => {
    if (!validate(step)) {
      window.setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus(), 0)
      return
    }
    void autosave.flush().catch(() => undefined)
    goTo(Math.min(step + 1, S_PODGLAD))
  }

  async function fillWithAi() {
    if (form.opis_wlasny.trim().length < 10) {
      setErrors({ opis_wlasny: 'Napisz kilka zdań o swoim pomyśle (co najmniej 10 znaków).' })
      return
    }
    setAiBusy(true)
    setAiNote(null)
    try {
      const r = await kreator.aiWypelnij(form.opis_wlasny.trim())
      if (!r.ai_uzyte) {
        setAiNote({ ok: false, text: r.komunikat ?? 'Podpowiedzi AI są chwilowo niedostępne. Wypełnij fiszkę ręcznie.' })
        return
      }
      const filled: PoleFiszki[] = []
      const merged: Form = { ...form }
      for (const key of ['istota', 'odbiorca', 'etap', 'obszar', 'lokalizacja', 'potrzeby'] as const) {
        const value = r.pola[key]
        // Nie nadpisujemy tego, co użytkownik już wpisał sam
        if (value && !form[key].trim()) {
          ;(merged as unknown as Record<string, string>)[key] = value
          filled.push(key)
        }
      }
      merged.pola_ai = [...new Set([...form.pola_ai, ...filled])]
      setForm(merged)
      autosave.schedule()
      setAiNote({
        ok: true,
        text: filled.length
          ? `Wstępnie wypełniliśmy ${filled.length} z 6 pól. Przejrzyj je w kolejnych krokach: pola od AI są oznaczone i możesz je dowolnie zmienić.`
          : 'AI nie znalazło w opisie nowych informacji do pól fiszki. Wypełnij kolejne kroki samodzielnie.',
      })
    } catch (e) {
      setAiNote({ ok: false, text: errorText(e) })
    } finally {
      setAiBusy(false)
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!validateAll()) return
    setSendBusy(true)
    setSendError('')
    try {
      await autosave.flush()
      if (!tokenRef.current) throw new Error('brak tokenu')
      const r = await kreator.sendFiszka(tokenRef.current, {
        autor_nazwa: author.name.trim() || undefined,
        autor_email: author.email.trim() || undefined,
      })
      const fresh = await kreator.fiszka(tokenRef.current)
      setFiszka({ ...fresh, token_watku: r.token_watku })
    } catch (err) {
      setSendError(errorText(err))
    } finally {
      setSendBusy(false)
    }
  }

  function validateAll(): boolean {
    for (const s of [S_ISTOTA, S_ODBIORCA, S_ETAP]) {
      if (!validate(s)) {
        goTo(s)
        return false
      }
    }
    return true
  }

  if (loading) return <div className="container page"><Loading text="Wczytywanie fiszki…" /></div>
  if (loadError) {
    return (
      <div className="container page">
        <h1>Nie znaleziono fiszki</h1>
        <ErrorBox message={loadError} />
        <p><Link to="/kreator/fiszka">Zacznij nową fiszkę</Link></p>
      </div>
    )
  }
  if (fiszka?.status === 'wyslana') return <SentView fiszka={fiszka} />

  const aiTag = (field: PoleFiszki) => (form.pola_ai.includes(field) ? <AiTag /> : undefined)

  return (
    <div className="container page kreator">
      <nav aria-label="Ścieżka nawigacji" className="breadcrumbs">
        <ol>
          <li><Link to="/kreator">Kreator pomysłów</Link></li>
          <li aria-current="page">Fiszka pomysłu</li>
        </ol>
      </nav>
      <StepProgress current={step} titles={STEPS} />
      <SaveStatus state={autosave.state} onRetry={() => void autosave.flush().catch(() => undefined)} />

      <form onSubmit={send} noValidate className="step-form">
        <h1 ref={heading} tabIndex={-1} className="step-title">{STEPS[step]}</h1>

        {step === S_OPIS && (
          <div className="stack">
            <p className="lead">Opisz swój pomysł własnymi słowami, tak jak opowiedziałbyś go znajomemu. Możesz też go podyktować. Potem AI wstępnie wypełni fiszkę, a Ty wszystko sprawdzisz i poprawisz. Ten krok możesz pominąć.</p>
            <LimitedTextarea
              id="f-opis" label="Twój pomysł własnymi słowami" value={form.opis_wlasny} limit={4000} rows={8}
              onChange={(v) => change('opis_wlasny', v)} error={errors.opis_wlasny} tour="kreator-opis"
              hint="Nie wpisuj danych osobowych ani numerów dokumentów."
            />
            <div className="btn-row">
              <VoiceButton onText={(t) => change('opis_wlasny', `${form.opis_wlasny} ${t}`.trim())} />
              <button type="button" className="btn btn-secondary" onClick={fillWithAi} disabled={aiBusy} data-tour="kreator-ai">
                <Sparkles size={18} aria-hidden="true" /> {aiBusy ? 'Wypełnianie…' : 'Wypełnij fiszkę za mnie'}
              </button>
            </div>
            {aiNote && (
              <p role="status" data-tour="kreator-ai-wynik" className={aiNote.ok ? 'alert alert-note' : 'alert alert-warning'}>{aiNote.text}</p>
            )}
          </div>
        )}

        {step === S_ISTOTA && (
          <div className="stack">
            <LimitedTextarea
              id="f-istota" label="Na czym polega Twój pomysł?" value={form.istota} limit={2000} rows={6}
              onChange={(v) => change('istota', v)} error={errors.istota} badges={aiTag('istota')} tour="kreator-istota"
              hint="Napisz 1–3 zdania prostym językiem: co zostanie zrobione i co się dzięki temu zmieni."
            />
            <SimilarInnovations token={token} refreshKey={form.istota} />
          </div>
        )}

        {step === S_ODBIORCA && (
          <LimitedTextarea
            id="f-odbiorca" label="Dla kogo jest ten pomysł?" value={form.odbiorca} limit={1000} rows={4}
            onChange={(v) => change('odbiorca', v)} error={errors.odbiorca} badges={aiTag('odbiorca')} tour="kreator-odbiorca"
            hint="Kto będzie z niego korzystał? Np. seniorzy, uczniowie, rodziny, pracownicy MOPS."
          />
        )}

        {step === S_ETAP && (
          <fieldset className="field" aria-describedby={errors.etap ? 'f-etap-error' : undefined} data-tour="kreator-etap">
            <legend>Na jakim etapie jest realizacja?</legend>
            {aiTag('etap') && <div className="field-badges">{aiTag('etap')}</div>}
            <div className="radio-cards">
              {ETAPY.map((e, i) => (
                <label key={e.value} className="radio-card">
                  <input
                    type="radio" name="etap" value={e.value} checked={form.etap === e.value}
                    onChange={() => change('etap', e.value)} data-tour={`kreator-etap-${e.value}`} data-invalid={errors.etap && i === 0 ? 'true' : undefined}
                  />
                  <span><strong>{e.label}</strong><span className="hint block">{e.opis}</span></span>
                </label>
              ))}
            </div>
            {errors.etap && <p id="f-etap-error" className="field-error" role="alert">{errors.etap}</p>}
          </fieldset>
        )}

        {step === S_DODATKOWE && (
          <div className="stack" data-tour="kreator-dodatkowe">
            <p className="lead">Te pola są nieobowiązkowe, ale pomagają zespołowi ROPS i generatorowi wniosków.</p>
            <div className="field">
              <label htmlFor="f-obszar">Obszar społeczny</label>
              {aiTag('obszar') && <div className="field-badges">{aiTag('obszar')}</div>}
              <select id="f-obszar" className="select" data-tour="kreator-obszar" value={form.obszar} onChange={(e) => change('obszar', e.target.value)}>
                <option value="">Nie wybieram</option>
                {Object.entries(KATEGORIE).map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-lok">Lokalizacja (gmina lub powiat)</label>
              {aiTag('lokalizacja') && <div className="field-badges">{aiTag('lokalizacja')}</div>}
              <input id="f-lok" className="input" data-tour="kreator-lokalizacja" value={form.lokalizacja} maxLength={200} onChange={(e) => change('lokalizacja', e.target.value)} />
            </div>
            <LimitedTextarea
              id="f-potrzeby" label="Czego potrzeba do dalszego rozwoju?" value={form.potrzeby} limit={2000} rows={4}
              onChange={(v) => change('potrzeby', v)} badges={aiTag('potrzeby')} tour="kreator-potrzeby"
              hint="Np. pieniędzy, partnera, miejsca, wiedzy, wolontariuszy."
            />
          </div>
        )}

        {step === S_PODGLAD && (
          <div className="stack">
            <p className="lead">Sprawdź fiszkę. Nic nie zostanie wysłane, dopóki nie klikniesz przycisku na dole.</p>
            <dl className="preview-list" data-tour="kreator-podglad">
              {([
                ['Na czym polega', form.istota, 'istota', S_ISTOTA],
                ['Dla kogo', form.odbiorca, 'odbiorca', S_ODBIORCA],
                ['Etap realizacji', etapLabel(form.etap || null) === '—' ? '' : etapLabel(form.etap || null), 'etap', S_ETAP],
                ['Obszar społeczny', KATEGORIE[form.obszar] ?? '', 'obszar', S_DODATKOWE],
                ['Lokalizacja', form.lokalizacja, 'lokalizacja', S_DODATKOWE],
                ['Czego potrzeba', form.potrzeby, 'potrzeby', S_DODATKOWE],
              ] as [string, string, PoleFiszki, number][]).map(([label, value, field, target]) => (
                <div key={label} className="preview-row">
                  <dt>{label} {aiTag(field)}</dt>
                  <dd className="pre">{value || <span className="hint">Nie podano</span>}</dd>
                  <dd><button type="button" className="btn btn-ghost" onClick={() => goTo(target)}>Zmień<span className="visually-hidden">: {label}</span></button></dd>
                </div>
              ))}
            </dl>
            <SimilarInnovations token={token} refreshKey={form.istota} />
            {token && <AssistantPanel token={token} />}
            <fieldset className="field">
              <legend>Dane kontaktowe (nieobowiązkowo)</legend>
              <div className="grid-fields">
                <div className="field">
                  <label htmlFor="f-name">Imię</label>
                  <input id="f-name" className="input" value={author.name} maxLength={200} autoComplete="given-name" onChange={(e) => setAuthor({ ...author, name: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="f-email">E-mail</label>
                  <input id="f-email" type="email" className="input" value={author.email} autoComplete="email" aria-describedby="f-email-hint" onChange={(e) => setAuthor({ ...author, email: e.target.value })} />
                  <p id="f-email-hint" className="hint">Podaj, jeśli chcesz dostać odpowiedź e-mailem. Bez e-maila odpowiedź zobaczysz pod linkiem po wysłaniu.</p>
                </div>
              </div>
            </fieldset>
            {sendError && <ErrorBox message={sendError} />}
          </div>
        )}

        <div className="btn-row step-nav">
          {step > S_OPIS && <button type="button" className="btn btn-secondary" onClick={() => goTo(step - 1)}>Wstecz</button>}
          {step < S_PODGLAD && (
            <button type="button" className="btn btn-primary" onClick={next} data-tour="kreator-dalej">
              {step === S_OPIS && !form.opis_wlasny.trim() ? 'Pomiń ten krok' : 'Dalej'}
            </button>
          )}
          {step === S_PODGLAD && (
            <button type="submit" className="btn btn-primary" disabled={sendBusy} data-tour="kreator-wyslij">
              {sendBusy ? 'Wysyłanie…' : 'Wyślij pomysł do ROPS'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function SentView({ fiszka }: { fiszka: Fiszka }) {
  useDocumentTitle('Pomysł wysłany · Kreator pomysłów · Splot')
  const thread = fiszka.token_watku ? `/watek/${fiszka.token_watku}` : null
  return (
    <div className="container page kreator">
      <h1>Pomysł wysłany do zespołu ROPS</h1>
      <p role="status" className="alert alert-note" data-tour="kreator-wyslano">Dziękujemy. Pracownik ROPS przeczyta zgłoszenie i odpowie. Status: czeka na odpowiedź.</p>
      {thread && (
        <p>
          Odpowiedź pojawi się pod tym adresem. Zapisz go lub dodaj do zakładek:{' '}
          <Link to={thread}>{window.location.origin}{thread}</Link>
        </p>
      )}
      <div className="btn-row">
        <Link className="btn btn-primary" to={`/kreator/finansowanie?fiszka=${fiszka.token}`}>Znajdź finansowanie</Link>
        <Link className="btn btn-secondary" to={`/kreator/canva?fiszka=${fiszka.token}`}>Wypełnij canvę innowacji</Link>
      </div>
      <SimilarInnovations token={fiszka.token} />
      <AssistantPanel token={fiszka.token} />
    </div>
  )
}
