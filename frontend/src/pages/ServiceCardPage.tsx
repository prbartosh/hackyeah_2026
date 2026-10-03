import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink, Printer, Send, Sparkles, TriangleAlert } from 'lucide-react'
import { api } from '@/admin/api'
import { errorText } from '@/admin/ui'
import { getInnovation } from '@/api/innovations'
import {
  createServiceCard, implementationRequestText, isTodo, problemOrNull,
  type ServiceCardResponse, type ServiceCardRole,
} from '@/api/serviceCard'
import { useChat } from '@/context/ChatContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ROLE_LABELS } from '@/types/chat'
import type { Innowacja } from '@/types/innowacja'
import '@/styles/service-card.css'

const ROLES: ServiceCardRole[] = ['cus-ops', 'partner']

function Item({ text }: { text: string }) {
  if (!isTodo(text)) return <>{text}</>
  return (
    <span className="todo">
      <TriangleAlert size={16} aria-hidden="true" /> {text}
    </span>
  )
}

function ListSection({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <section className="sc-section">
      <h2>{title}</h2>
      <Tag>{items.map((i, n) => <li key={n}><Item text={i} /></li>)}</Tag>
    </section>
  )
}

/** „Chcę to wdrożyć”: karta trafia do skrzynki panelu ROPS jako zwykłe zgłoszenie. */
function ImplementForm({ card }: { card: ServiceCardResponse }) {
  const [note, setNote] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const url = `${window.location.origin}/innowacja/${card.slug}`
      const r = await api.createTicket({
        tresc: implementationRequestText(card, url, note),
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
    const link = `/watek/${token}`
    return (
      <section className="side-box no-print" aria-labelledby="impl-title">
        <h2 id="impl-title">Wysłane do ROPS</h2>
        <p role="status">Zespół ROPS dostał Twoją kartę i odpowie pod tym adresem. Zapisz go:</p>
        <p><Link to={link}>{window.location.origin}{link}</Link></p>
      </section>
    )
  }

  return (
    <section className="side-box no-print" aria-labelledby="impl-title">
      <h2 id="impl-title">Chcę to wdrożyć</h2>
      <p>Wyślij kartę do ROPS. Pracownik pomoże z materiałami i kontaktem do autorów rozwiązania.</p>
      <form onSubmit={submit} className="sc-form" noValidate>
        <label htmlFor="impl-note">Wiadomość (nieobowiązkowo)</label>
        <textarea id="impl-note" className="textarea" rows={3} maxLength={500} value={note}
          onChange={(e) => setNote(e.target.value)} aria-describedby="impl-note-hint" />
        <p id="impl-note-hint" className="hint">Np. nazwa instytucji i kiedy chcesz zacząć. Bez danych wrażliwych.</p>
        <label htmlFor="impl-email">E-mail do odpowiedzi (nieobowiązkowo)</label>
        <input id="impl-email" className="input" type="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          <Send size={18} aria-hidden="true" /> {busy ? 'Wysyłanie…' : 'Wyślij do ROPS'}
        </button>
      </form>
    </section>
  )
}

export default function ServiceCardPage() {
  const { slug = '' } = useParams()
  const { state: chat } = useChat()
  const chatRole = chat.rola === 'cus-ops' || chat.rola === 'partner' ? chat.rola : null
  const problem = problemOrNull(chat)

  const [rec, setRec] = useState<Innowacja | null | undefined>(undefined)
  const [role, setRole] = useState<ServiceCardRole | null>(chatRole)
  const [picking, setPicking] = useState(chatRole === null)
  const [roleError, setRoleError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [card, setCard] = useState<ServiceCardResponse | null>(null)
  const cardHeading = useRef<HTMLHeadingElement>(null)

  useDocumentTitle(`${rec ? `Jak wdrożyć: ${rec.nazwa}` : 'Jak wdrożyć u siebie'} · Splot`)

  useEffect(() => {
    const controller = new AbortController()
    getInnovation(slug, controller.signal)
      .then(setRec)
      .catch(() => { if (!controller.signal.aborted) setRec(null) })
    return () => controller.abort()
  }, [slug])

  useEffect(() => {
    if (card) cardHeading.current?.focus()
  }, [card])

  async function generate(e: FormEvent) {
    e.preventDefault()
    if (!role) {
      setRoleError('Wybierz, kim jesteś.')
      return
    }
    setRoleError('')
    setError('')
    setBusy(true)
    try {
      setCard(await createServiceCard(slug, role, problem))
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const back = <Link to={`/innowacja/${slug}`}>← Wróć do opisu rozwiązania</Link>

  if (rec === undefined) {
    return <div className="container page"><p role="status">Wczytywanie…</p></div>
  }
  if (rec === null) {
    return (
      <div className="container page">
        <h1>Nie znaleziono rozwiązania</h1>
        <p>Ta pozycja nie istnieje w bazie albo nie udało się jej wczytać.</p>
        <p>{back}</p>
      </div>
    )
  }

  return (
    <div className="container page service-card">
      <nav aria-label="Ścieżka nawigacji" className="breadcrumbs no-print">
        <ol>
          <li><Link to="/">Strona główna</Link></li>
          <li><Link to={`/innowacja/${slug}`}>{rec.nazwa}</Link></li>
          <li aria-current="page">Jak wdrożyć u siebie</li>
        </ol>
      </nav>

      <h1>Jak wdrożyć u siebie: {rec.nazwa}</h1>
      <p className="lead">
        Asystent przepisze to rozwiązanie na plan dla Twojej instytucji: cel, kroki, potrzebne zasoby, ryzyka
        i jak sprawdzić, że działa. Korzysta tylko z opisu w Bibliotece Innowacji ROPS.
      </p>

      <form onSubmit={generate} className="sc-setup no-print" noValidate>
        {!picking && role && (
          <p>Przygotujemy kartę dla roli: <strong>{ROLE_LABELS[role]}</strong>.{' '}
            <button type="button" className="btn-link" onClick={() => setPicking(true)}>Zmień</button>
          </p>
        )}
        {picking && (
          <fieldset className="sc-roles" aria-describedby={roleError ? 'role-error' : undefined}>
            <legend>Kim jesteś?</legend>
            {ROLES.map((r) => (
              <label key={r} className="sc-role">
                <input type="radio" name="rola" value={r} checked={role === r} onChange={() => setRole(r)} />
                {ROLE_LABELS[r]}
              </label>
            ))}
            {roleError && <p id="role-error" className="field-error" role="alert">{roleError}</p>}
          </fieldset>
        )}
        {problem && (
          <p className="hint">Uwzględnimy też opis problemu z rozmowy na stronie głównej.</p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            <Sparkles size={18} aria-hidden="true" />
            {busy ? 'Przygotowuję kartę…' : card ? 'Przygotuj ponownie' : 'Przygotuj kartę wdrożenia'}
          </button>
        </div>
        <p role="status" className="hint">{busy ? 'To potrwa kilka sekund.' : ''}</p>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
      </form>

      {card && (
        <div className="detail-layout sc-result">
          <article className="sc-card print-area" aria-labelledby="card-title">
            <h2 id="card-title" ref={cardHeading} tabIndex={-1} className="sc-card-title">
              Karta wdrożenia dla roli: {ROLE_LABELS[card.rola]}
            </h2>
            <p className="sc-ai">
              <Sparkles size={16} aria-hidden="true" /> Przygotowane przez AI na podstawie opisu innowacji.
              Sprawdź przed użyciem. Punkty „do uzupełnienia” wymagają Twoich danych.
            </p>
            <section className="sc-section">
              <h2>Cel</h2>
              <p><Item text={card.karta.cel} /></p>
            </section>
            <section className="sc-section">
              <h2>Dla kogo</h2>
              <p><Item text={card.karta.odbiorcy} /></p>
            </section>
            <ListSection title="Kroki wdrożenia" items={card.karta.kroki} ordered />
            <ListSection title="Potrzebne zasoby" items={card.karta.zasoby} />
            <ListSection title="Na co uważać" items={card.karta.ryzyka} />
            <ListSection title="Jak sprawdzić, że działa" items={card.karta.wskazniki_sukcesu} />
            <p className="sc-source">
              Źródło: <a href={rec.url_zrodlowy} target="_blank" rel="noreferrer">
                Biblioteka Innowacji Społecznych ROPS: {rec.nazwa}
                <span className="visually-hidden"> (otwiera się w nowej karcie)</span> <ExternalLink size={14} aria-hidden="true" />
              </a>
            </p>
          </article>

          <aside className="detail-side no-print" aria-label="Co dalej">
            <section className="side-box">
              <h2>Zachowaj kartę</h2>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => window.print()}>
                <Printer size={18} aria-hidden="true" /> Drukuj lub zapisz PDF
              </button>
              <Link to={`/kreator/finansowanie?karta=${slug}`} className="btn btn-secondary btn-block">
                Znajdź finansowanie
              </Link>
            </section>
            <ImplementForm card={card} />
          </aside>
        </div>
      )}

      <p className="back-link no-print">{back}</p>
    </div>
  )
}
