import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { ErrorBox, Loading, errorText, useLoad } from '@/admin/ui'
import { downloadFile, exportUrl, kreator } from '@/kreator/api'
import { LimitedTextarea, SaveStatus, StepProgress } from '@/kreator/components'
import { rememberDraft } from '@/kreator/storage'
import type { Canva, CanvaSekcja } from '@/kreator/types'
import { useAutosave } from '@/kreator/useAutosave'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const LIMIT = 3000

function groupsOf(sections: CanvaSekcja[]): { name: string; sections: CanvaSekcja[] }[] {
  const groups: { name: string; sections: CanvaSekcja[] }[] = []
  for (const s of sections) {
    const last = groups[groups.length - 1]
    if (last && last.name === s.grupa) last.sections.push(s)
    else groups.push({ name: s.grupa, sections: [s] })
  }
  return groups
}

export default function CanvaPage() {
  const { token } = useParams()
  return token ? <CanvaEditor token={token} /> : <CanvaStart />
}

function CanvaStart() {
  useDocumentTitle('Canva innowacji · Kreator pomysłów · Splot')
  const [params] = useSearchParams()
  const fiszka = params.get('fiszka') ?? undefined
  const navigate = useNavigate()
  const { data, error, loading, reload } = useLoad(() => kreator.szablonyCanvy(), [])
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [startError, setStartError] = useState('')

  async function start(slug: string) {
    setBusy(true)
    setStartError('')
    try {
      const canva = await kreator.createCanva({ szablon: slug, tytul: title.trim(), fiszka_token: fiszka })
      rememberDraft({ typ: 'canva', token: canva.token, tytul: canva.tytul || 'Canva bez tytułu' })
      navigate(`/kreator/canva/${canva.token}`)
    } catch (e) {
      setStartError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container page kreator">
      <nav aria-label="Ścieżka nawigacji" className="breadcrumbs">
        <ol>
          <li><Link to="/kreator">Kreator pomysłów</Link></li>
          <li aria-current="page">Canva innowacji</li>
        </ol>
      </nav>
      <h1>Canva innowacji społecznych</h1>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {startError && <ErrorBox message={startError} />}
      {data?.map((t) => (
        <section key={t.slug} className="panel">
          <h2>{t.nazwa}</h2>
          {t.opis && <p>{t.opis}</p>}
          {t.url_zrodlowy && <p className="hint">Źródło wzoru: <a href={t.url_zrodlowy} target="_blank" rel="noreferrer">strona ROPS Kraków<span className="visually-hidden"> (otwiera się w nowej karcie)</span></a></p>}
          <p>Plansza ma {t.sekcje.length} pól w {groupsOf(t.sekcje).length} krokach. Każde pole ma krótką podpowiedź. {fiszka && 'Zostanie powiązana z Twoją fiszką.'}</p>
          <div className="field">
            <label htmlFor="c-title">Nazwa canvy (nieobowiązkowo)</label>
            <input id="c-title" className="input" value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={() => start(t.slug)} disabled={busy}>{busy ? 'Tworzenie…' : 'Rozpocznij wypełnianie'}</button>
          </div>
        </section>
      ))}
    </div>
  )
}

function CanvaEditor({ token }: { token: string }) {
  useDocumentTitle('Canva innowacji · Kreator pomysłów · Splot')
  const { data, error, loading, reload } = useLoad(() => kreator.canva(token), [token])
  const [values, setValues] = useState<Record<string, string>>({})
  const [title, setTitle] = useState('')
  const [step, setStep] = useState(0)
  const [fileError, setFileError] = useState('')
  const valuesRef = useRef(values)
  const titleRef = useRef(title)
  const dirty = useRef(new Set<string>())
  const titleDirty = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    valuesRef.current = values
    titleRef.current = title
  })

  useEffect(() => {
    if (!data) return
    setValues(data.wartosci)
    setTitle(data.tytul)
    rememberDraft({ typ: 'canva', token, tytul: data.tytul || 'Canva bez tytułu' })
  }, [data, token])

  const persist = useCallback(async () => {
    const keys = [...dirty.current]
    const changes = Object.fromEntries(keys.map((k) => [k, valuesRef.current[k] ?? '']))
    const savedTitle = titleRef.current
    const saveTitle = titleDirty.current
    const body: { wartosci?: Record<string, string>; tytul?: string } = {}
    if (keys.length) body.wartosci = changes
    if (saveTitle) body.tytul = savedTitle
    await kreator.saveCanva(token, body)
    for (const key of keys) {
      if ((valuesRef.current[key] ?? '') === changes[key]) dirty.current.delete(key)
    }
    if (saveTitle && titleRef.current === savedTitle) titleDirty.current = false
    rememberDraft({ typ: 'canva', token, tytul: titleRef.current || 'Canva bez tytułu' })
  }, [token])
  const autosave = useAutosave(persist)

  const groups = useMemo(() => groupsOf((data as Canva | undefined)?.szablon.sekcje ?? []), [data])
  const titles = [...groups.map((g) => g.name), 'Podgląd i eksport']

  const goTo = (n: number) => {
    setStep(n)
    window.setTimeout(() => heading.current?.focus(), 0)
  }

  if (loading && !data) return <div className="container page"><Loading text="Wczytywanie canvy…" /></div>
  if (error || !data) {
    return (
      <div className="container page">
        <h1>Nie znaleziono canvy</h1>
        <ErrorBox message={error ?? 'Nie udało się wczytać canvy.'} onRetry={reload} />
        <p><Link to="/kreator/canva">Zacznij nową canvę</Link></p>
      </div>
    )
  }

  const preview = step === groups.length
  async function download() {
    setFileError('')
    try {
      await autosave.flush()
      await downloadFile(exportUrl.canva(token), 'canva-innowacji.docx')
    } catch (e) {
      setFileError(errorText(e))
    }
  }

  return (
    <div className="container page kreator canva">
      <div className="no-print">
        <nav aria-label="Ścieżka nawigacji" className="breadcrumbs">
          <ol>
            <li><Link to="/kreator">Kreator pomysłów</Link></li>
            <li aria-current="page">Canva innowacji</li>
          </ol>
        </nav>
        <StepProgress current={step} titles={titles} />
        <SaveStatus state={autosave.state} onRetry={() => void autosave.flush().catch(() => undefined)} />
      </div>

      <h1 ref={heading} tabIndex={-1} className="step-title">{preview ? 'Podgląd i eksport' : groups[step].name}</h1>

      {!preview && (
        <div className="stack no-print">
          {step === 0 && (
            <div className="field">
              <label htmlFor="c-tytul">Nazwa canvy</label>
              <input id="c-tytul" className="input" value={title} maxLength={300}
                onChange={(e) => { setTitle(e.target.value); titleDirty.current = true; autosave.schedule() }} />
            </div>
          )}
          {data.fiszka_token && step === 0 && (
            <p className="hint">Canva jest powiązana z Twoją <Link to={`/kreator/fiszka/${data.fiszka_token}`}>fiszką pomysłu</Link>.</p>
          )}
          {groups[step].sections.map((s) => (
            <div key={s.klucz} className="canva-field">
              <LimitedTextarea
                id={`c-${s.klucz}`} label={s.tytul} value={values[s.klucz] ?? ''} limit={LIMIT} rows={4}
                hint={s.podpowiedz}
                onChange={(v) => { setValues((x) => ({ ...x, [s.klucz]: v })); dirty.current.add(s.klucz); autosave.schedule() }}
              />
              {s.pytania.length > 0 && (
                <details className="canva-help">
                  <summary>Pytania pomocnicze</summary>
                  <ul>{s.pytania.map((q) => <li key={q}>{q}</li>)}</ul>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="print-area">
          <h2 className="print-title">{title || data.szablon.nazwa}</h2>
          {groups.map((g) => (
            <section key={g.name} className="canva-group">
              <h3>{g.name}</h3>
              <dl>
                {g.sections.map((s) => (
                  <div key={s.klucz} className="canva-cell">
                    <dt>{s.tytul}</dt>
                    <dd className="pre">{values[s.klucz]?.trim() || <span className="hint">Do uzupełnienia</span>}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          <p className="hint print-source">Wzór: {data.szablon.nazwa}{data.szablon.url_zrodlowy ? `, ${data.szablon.url_zrodlowy}` : ''}</p>
        </div>
      )}

      <div className="btn-row step-nav no-print">
        {step > 0 && <button type="button" className="btn btn-secondary" onClick={() => goTo(step - 1)}>Wstecz</button>}
        {!preview && <button type="button" className="btn btn-primary" onClick={() => { void autosave.flush().catch(() => undefined); goTo(step + 1) }}>{step === groups.length - 1 ? 'Podgląd i eksport' : 'Dalej'}</button>}
        {preview && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}><Printer size={18} aria-hidden="true" /> Drukuj</button>
            <button type="button" className="btn btn-secondary" onClick={download}><Download size={18} aria-hidden="true" /> Pobierz DOCX</button>
          </>
        )}
      </div>
      {fileError && <ErrorBox message={fileError} />}
    </div>
  )
}
