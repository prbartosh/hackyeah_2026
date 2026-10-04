import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { api } from '@/admin/api'
import {
  ErrorBox, Loading, SlaBadge, StatusBadge, SyntheticTag, UrgencyBadge,
  categoryName, errorText, formatDate, useLoad, useTitle,
} from '@/admin/ui'
import type { Ticket } from '@/admin/types'
import MentorAssign from '@/admin/MentorAssign'

const ROLE_LABEL: Record<string, string> = { admin: 'Odpowiedź ROPS', mentor: 'Mentor', system: 'Informacja' }

function Thread({ ticket }: { ticket: Ticket }) {
  return (
    <section aria-labelledby="thread-h" className="panel">
      <h2 id="thread-h">Rozmowa z autorem</h2>
      <ol className="thread">
        {ticket.wiadomosci.map((m, i) => (
          <li key={i} className={m.autor_rola === 'uzytkownik' ? 'msg-author' : 'msg-admin'}>
            <p className="hint">
              {ROLE_LABEL[m.autor_rola] ?? ticket.autor_nazwa ?? 'Autor zgłoszenia'} · {formatDate(m.created_at)}
            </p>
            <p className="pre">{m.tresc}</p>
            {m.zrodla && m.zrodla.length > 0 && (
              <p className="hint">
                Źródła: {m.zrodla.map((s, j) => (
                  <span key={s.slug}>{j > 0 && ', '}<Link to={`/innowacja/${s.slug}`}>{s.nazwa}</Link></span>
                ))}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

function Triage({ ticket }: { ticket: Ticket }) {
  return (
    <section aria-labelledby="triage-h" className="panel">
      <h2 id="triage-h"><Sparkles size={20} aria-hidden="true" /> Analiza zgłoszenia</h2>
      <p className="hint">
        {ticket.triaz_zrodlo === 'ai'
          ? 'Podpowiedź AI. Sprawdź ją, zanim z niej skorzystasz.'
          : 'Propozycje oparte na prostych regułach (bez AI). Sprawdź je, zanim z nich skorzystasz.'}
      </p>
      {ticket.triaz_komunikat && <p className="alert alert-warning" role="status">{ticket.triaz_komunikat}</p>}
      <dl className="facts">
        <div><dt>Obszar</dt><dd>{categoryName(ticket.kategoria)}</dd></div>
        <div>
          <dt>Pilność</dt>
          <dd>
            <UrgencyBadge urgency={ticket.pilnosc} />
            {ticket.pilnosc_uzasadnienie && <span className="hint block">{ticket.pilnosc_uzasadnienie}</span>}
          </dd>
        </div>
        <div><dt>Czas</dt><dd><SlaBadge sla={ticket.sla} answered={ticket.status === 'odpowiedziane'} /></dd></div>
      </dl>

      <h3>Możliwe duplikaty</h3>
      {ticket.duplikaty.length === 0 ? (
        <p className="empty-state">Nie znaleziono podobnych zgłoszeń.</p>
      ) : (
        <ul className="plain-list">
          {ticket.duplikaty.map((d) => (
            <li key={d.id}>
              <Link to={`/admin/zgloszenia/${d.id}`}>Nr {d.id}</Link> — podobieństwo {Math.round(d.score * 100)}%
              <span className="hint block">{d.tresc}</span>
            </li>
          ))}
        </ul>
      )}

      <h3>Pasujące karty z bazy ROPS</h3>
      {ticket.proponowane_karty.length === 0 ? (
        <p className="empty-state">W bazie nie ma kart, które pasują do tego zgłoszenia.</p>
      ) : (
        <ul className="plain-list">
          {ticket.proponowane_karty.map((c) => (
            <li key={c.slug}>
              <Link to={`/innowacja/${c.slug}`}>{c.nazwa}</Link> — dopasowanie {Math.round(c.score * 100)}%
              {c.uzyta && <> <span className="tag tag-ontime">użyta w szkicu</span></>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Reply({ ticket, onChange }: { ticket: Ticket; onChange: (t: Ticket) => void }) {
  const [text, setText] = useState(ticket.szkic_odpowiedzi ?? '')
  const [sources, setSources] = useState<Set<string>>(
    new Set(ticket.proponowane_karty.filter((c) => c.uzyta).map((c) => c.slug)),
  )
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const approveRef = useRef<HTMLButtonElement>(null)
  const wasConfirming = useRef(false)

  // Po otwarciu potwierdzenia fokus idzie na jego przycisk, po zamknięciu wraca na „Zatwierdź odpowiedź”
  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
    else if (wasConfirming.current) approveRef.current?.focus()
    wasConfirming.current = confirming
  }, [confirming])

  // Esc zamyka potwierdzenie, a Tab krąży tylko po jego przyciskach
  function onConfirmKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      setConfirming(false)
      return
    }
    if (e.key !== 'Tab') return
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled)'))
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  async function run(action: () => Promise<Ticket>, after?: () => void) {
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      const next = await action()
      onChange(next)
      after?.()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <section aria-labelledby="reply-h" className="panel panel-main">
      <h2 id="reply-h">Odpowiedź do autora</h2>
      <p className="hint">
        Szkic jest tylko propozycją. Nic nie zostanie wysłane, dopóki nie zatwierdzisz odpowiedzi.
      </p>
      <div className="field">
        <label htmlFor="reply-text">Treść odpowiedzi (możesz ją dowolnie zmienić)</label>
        <textarea id="reply-text" className="textarea" rows={12} value={text} onChange={(e) => { setText(e.target.value); setSaved(false) }} />
      </div>
      {ticket.proponowane_karty.length > 0 && (
        <fieldset className="field">
          <legend>Karty, na które powołujesz się w odpowiedzi</legend>
          {ticket.proponowane_karty.map((c) => (
            <label key={c.slug} className="check">
              <input
                type="checkbox" checked={sources.has(c.slug)}
                onChange={(e) => {
                  const next = new Set(sources)
                  if (e.target.checked) next.add(c.slug)
                  else next.delete(c.slug)
                  setSources(next)
                }}
              />
              {c.nazwa}
            </label>
          ))}
        </fieldset>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      {saved && <p className="status-ok" role="status">Szkic zapisany.</p>}

      {!confirming ? (
        <div className="btn-row">
          <button ref={approveRef} type="button" className="btn btn-primary" disabled={busy || !text.trim()} onClick={() => setConfirming(true)}>
            Zatwierdź odpowiedź
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy}
            onClick={() => run(() => api.saveDraft(ticket.id, text), () => setSaved(true))}>
            Zapisz szkic
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy}
            onClick={() => run(async () => { const t = await api.triage(ticket.id); setText(t.szkic_odpowiedzi ?? ''); return t })}>
            Wygeneruj szkic od nowa
          </button>
        </div>
      ) : (
        <div className="confirm" role="alertdialog" aria-labelledby="confirm-h" aria-describedby="confirm-d" onKeyDown={onConfirmKeyDown}>
          <h3 id="confirm-h">Wysłać tę odpowiedź?</h3>
          <p id="confirm-d">
            Odpowiedź trafi do autora zgłoszenia{ticket.autor_email ? ` (${ticket.autor_email})` : ' i będzie widoczna pod jego linkiem do rozmowy'}. Tego nie da się cofnąć.
          </p>
          <div className="btn-row">
            <button ref={confirmRef} type="button" className="btn btn-primary" disabled={busy}
              onClick={() => run(() => api.approveReply(ticket.id, text.trim(), [...sources]))}>
              Tak, wyślij odpowiedź
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>Wróć do edycji</button>
          </div>
        </div>
      )}
    </section>
  )
}

export default function TicketPage() {
  const id = Number(useParams().id)
  useTitle(`Zgłoszenie nr ${id}`)
  const { data, error, loading, reload, setData } = useLoad(() => api.ticket(id), [id])
  const [analysing, setAnalysing] = useState(false)
  const [triageError, setTriageError] = useState('')
  const started = useRef<number | null>(null)
  const answeredRef = useRef<HTMLParagraphElement>(null)
  const prevStatus = useRef<string | undefined>(undefined)

  // Po wysłaniu odpowiedzi przycisk znika: przenieś fokus na komunikat o wysłaniu.
  useEffect(() => {
    if (prevStatus.current && prevStatus.current !== 'odpowiedziane' && data?.status === 'odpowiedziane') {
      answeredRef.current?.focus()
    }
    prevStatus.current = data?.status
  }, [data?.status])

  // Zgłoszenie bez analizy: uruchom ją raz po otwarciu (jedna akcja mniej dla pracownika).
  useEffect(() => {
    if (!data || data.triaz_wykonany || started.current === data.id) return
    started.current = data.id
    setAnalysing(true)
    api.triage(data.id)
      .then(setData)
      .catch((e) => setTriageError(errorText(e)))
      .finally(() => setAnalysing(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id, data?.triaz_wykonany])

  if (loading && !data) return <Loading text="Wczytywanie zgłoszenia…" />
  if (error || !data) return <ErrorBox message={error ?? 'Nie znaleziono zgłoszenia.'} onRetry={reload} />

  return (
    <>
      <p><Link to="/admin">← Wróć do skrzynki</Link></p>
      <h1>Zgłoszenie nr {data.id} {data.syntetyczne && <SyntheticTag />}</h1>
      <p className="meta-line">
        <StatusBadge status={data.status} /> Wpłynęło {formatDate(data.created_at)}
        {data.autor_nazwa && <> · {data.autor_nazwa}</>}
      </p>
      <blockquote className="ticket-text pre">{data.tresc}</blockquote>

      {analysing && <Loading text="AI analizuje zgłoszenie…" />}
      {triageError && <ErrorBox message={`${triageError} Możesz odpowiedzieć ręcznie.`} onRetry={() => { started.current = null; setTriageError(''); reload() }} />}

      <div className="ticket-layout">
        <div>
          {data.status !== 'odpowiedziane' ? (
            <Reply
              key={`${data.triaz_wykonany}-${data.proponowane_karty.map((c) => c.slug + c.uzyta).join()}`}
              ticket={data}
              onChange={setData}
            />
          ) : (
            <p ref={answeredRef} tabIndex={-1} className="alert alert-warning" role="status">Na to zgłoszenie odpowiedziano. Odpowiedź jest w rozmowie poniżej.</p>
          )}
          <Thread ticket={data} />
        </div>
        <div>
          <MentorAssign ticketId={data.id} kategoria={data.kategoria} onChange={reload} />
          {data.triaz_wykonany && <Triage ticket={data} />}
        </div>
      </div>
    </>
  )
}
