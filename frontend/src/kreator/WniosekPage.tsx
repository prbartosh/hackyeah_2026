import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download, Send } from 'lucide-react'
import { ErrorBox, Loading, errorText, useLoad } from '@/admin/ui'
import { downloadFile, exportUrl, kreator } from '@/kreator/api'
import { AiTag, LimitedTextarea, MissingTag, SaveStatus } from '@/kreator/components'
import { formatDay } from '@/kreator/helpers'
import { rememberDraft } from '@/kreator/storage'
import type { WniosekPole } from '@/kreator/types'
import { useAutosave } from '@/kreator/useAutosave'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

function SourceBadge({ pole }: { pole: WniosekPole }) {
  if (pole.do_uzupelnienia) return <MissingTag />
  if (pole.zrodlo === 'ai') return <AiTag>Szkic od AI: sprawdź i popraw</AiTag>
  if (pole.zrodlo === 'uzytkownik') return <span className="tag">Poprawione przez Ciebie</span>
  return <span className="tag">Z fiszki, bez AI</span>
}

/** Szkic wniosku do edycji: każde pole z limitem znaków i informacją, skąd pochodzi tekst. */
export default function WniosekPage() {
  const { token = '' } = useParams()
  useDocumentTitle('Szkic wniosku · Kreator pomysłów · Splot')
  const { data, error, loading, reload } = useLoad(() => kreator.wniosek(token), [token])
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [sources, setSources] = useState<Record<string, WniosekPole['zrodlo']>>({})
  const textsRef = useRef(texts)
  const dirtyKeys = useRef(new Set<string>())
  const [fileError, setFileError] = useState('')
  const [sendError, setSendError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sentThread, setSentThread] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    textsRef.current = texts
  })

  useEffect(() => {
    if (!data) return
    setTexts(Object.fromEntries(data.pola.map((p) => [p.klucz, p.tekst])))
    setSources(Object.fromEntries(data.pola.map((p) => [p.klucz, p.zrodlo])))
    setSentThread(data.token_watku)
    rememberDraft({ typ: 'wniosek', token, tytul: `Wniosek: ${data.nabor.nazwa}` })
  }, [data, token])

  const persist = useCallback(async () => {
    const changes = Object.fromEntries([...dirtyKeys.current].map((k) => [k, textsRef.current[k]]))
    dirtyKeys.current.clear()
    await kreator.saveWniosek(token, changes)
  }, [token])
  const autosave = useAutosave(persist)

  const change = (pole: WniosekPole, value: string) => {
    setTexts((t) => ({ ...t, [pole.klucz]: value }))
    setSources((s) => ({ ...s, [pole.klucz]: value === '' ? 'brak' : 'uzytkownik' }))
    dirtyKeys.current.add(pole.klucz)
    autosave.schedule()
  }

  async function download(format: 'docx' | 'txt') {
    setFileError('')
    try {
      await autosave.flush()
      await downloadFile(exportUrl.wniosek(token, format), `wniosek.${format}`)
    } catch (e) {
      setFileError(errorText(e))
    }
  }

  async function send() {
    setBusy(true)
    setSendError('')
    try {
      await autosave.flush()
      setSentThread((await kreator.sendWniosek(token)).token_watku)
      setConfirming(false)
    } catch (e) {
      setSendError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  if (loading && !data) return <div className="container page"><Loading text="Wczytywanie wniosku…" /></div>
  if (error || !data) {
    return (
      <div className="container page">
        <h1>Nie znaleziono wniosku</h1>
        <ErrorBox message={error ?? 'Nie udało się wczytać wniosku.'} onRetry={reload} />
        <p><Link to="/kreator/finansowanie">Wróć do naborów</Link></p>
      </div>
    )
  }

  const sent = sentThread !== null || data.status === 'wyslany'
  const missing = data.pola.filter((p) => !(texts[p.klucz] ?? p.tekst).trim()).length
  return (
    <div className="container page kreator">
      <nav aria-label="Ścieżka nawigacji" className="breadcrumbs">
        <ol>
          <li><Link to="/kreator">Kreator pomysłów</Link></li>
          <li><Link to={`/kreator/finansowanie?fiszka=${data.fiszka_token}`}>Znajdź finansowanie</Link></li>
          <li aria-current="page">Szkic wniosku</li>
        </ol>
      </nav>
      <h1>Szkic wniosku: {data.nabor.nazwa}</h1>
      <p className="meta-line">
        <span>Nabór trwa do {formatDay(data.nabor.termin_do)}</span>
        {data.nabor.url_zrodlowy && <a href={data.nabor.url_zrodlowy} target="_blank" rel="noreferrer">Strona naboru<span className="visually-hidden"> (otwiera się w nowej karcie)</span></a>}
        {data.nabor.syntetyczny && <span className="tag tag-synthetic">Dane demo</span>}
      </p>
      {!data.nabor_aktywny && <p className="alert alert-warning" role="status">Ten nabór już się zakończył. Możesz pobrać wniosek, ale nie wyślesz go przez platformę.</p>}
      {data.komunikat_ai && <p className="alert alert-note" role="status">{data.komunikat_ai}</p>}
      <p className="lead">Przejrzyj każde pole. Pod polem widać, z jakich danych fiszki powstał tekst. Niczego nie dopisaliśmy od siebie: braki oznaczyliśmy jako „Do uzupełnienia”.</p>
      <SaveStatus state={autosave.state} onRetry={() => void autosave.flush()} />

      <div className="edit-layout">
        <form onSubmit={(e) => e.preventDefault()} className="stack" aria-label="Pola wniosku">
          {data.pola.map((pole) => {
            const current: WniosekPole = { ...pole, zrodlo: sources[pole.klucz] ?? pole.zrodlo, do_uzupelnienia: !(texts[pole.klucz] ?? pole.tekst).trim() }
            return (
              <div key={pole.klucz} className="wniosek-pole">
                <LimitedTextarea
                  id={`w-${pole.klucz}`} label={pole.etykieta} value={texts[pole.klucz] ?? pole.tekst}
                  limit={pole.limit} rows={pole.limit > 600 ? 9 : 5} hint={pole.wskazowka || undefined}
                  onChange={(v) => change(pole, v)} badges={<SourceBadge pole={current} />}
                />
                {pole.uzyte_pola.length > 0 && (
                  <p className="hint">Dane z fiszki użyte w tym polu: {pole.uzyte_pola.join(', ')}.</p>
                )}
              </div>
            )
          })}
        </form>

        <aside className="preview" aria-label="Kryteria oceny i działania">
          {data.kryteria.length > 0 && (
            <section className="panel">
              <h2>Kryteria oceny naboru</h2>
              <ul>{data.kryteria.map((k) => <li key={k.nazwa}><strong>{k.nazwa}</strong>{k.opis && <span className="block hint">{k.opis}</span>}</li>)}</ul>
            </section>
          )}
          <section className="panel">
            <h2>Gotowe?</h2>
            <p>{missing > 0 ? `Pola do uzupełnienia: ${missing}. Możesz je dopisać teraz albo po pobraniu pliku.` : 'Wszystkie pola mają treść.'}</p>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={() => download('docx')}><Download size={18} aria-hidden="true" /> Pobierz DOCX</button>
              <button type="button" className="btn btn-secondary" onClick={() => download('txt')}>Pobierz tekst</button>
            </div>
            {fileError && <ErrorBox message={fileError} />}
            <h3>Wyślij do ROPS (nieobowiązkowo)</h3>
            {sent ? (
              <p role="status" className="alert alert-note">Wniosek wysłany do zespołu ROPS.{sentThread && <> <Link to={`/watek/${sentThread}`}>Zobacz odpowiedź</Link></>}</p>
            ) : confirming ? (
              <div className="confirm" role="group" aria-label="Potwierdzenie wysłania">
                <p>Wniosek trafi do skrzynki zespołu ROPS jako zgłoszenie. To nie jest złożenie wniosku w naborze: ten krok wykonujesz sam u organizatora. Wysłać?</p>
                <div className="btn-row">
                  <button type="button" className="btn btn-primary" onClick={send} disabled={busy}>{busy ? 'Wysyłanie…' : 'Tak, wyślij do ROPS'}</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>Anuluj</button>
                </div>
              </div>
            ) : (
              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={() => setConfirming(true)} disabled={!data.nabor_aktywny}>
                  <Send size={18} aria-hidden="true" /> Wyślij do ROPS
                </button>
              </div>
            )}
            {sendError && <ErrorBox message={sendError} />}
          </section>
        </aside>
      </div>
    </div>
  )
}
