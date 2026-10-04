import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Circle, CircleDot, Clock } from 'lucide-react'
import { AdminApiError } from '@/admin/api'
import type { Pilnosc, Sla, StatusKarty, StatusZgloszenia } from '@/admin/types'
import { KATEGORIE } from '@/types/innowacja'

export function useTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Panel ROPS · Splot`
  }, [title])
}

export function errorText(e: unknown): string {
  return e instanceof AdminApiError ? e.message : 'Coś poszło nie tak. Spróbuj ponownie.'
}

/** Ładowanie danych z obsługą błędu i ponowieniem; stan ładowania jest czytelny dla czytnika ekranu. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[]) {
  type State = { loader?: () => Promise<T>; data?: T; error?: string; loading: boolean }
  const [state, setState] = useState<State>({ loading: true })
  const requestId = useRef(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableLoader = useCallback(loader, deps)
  const load = useCallback(() => {
    const id = ++requestId.current
    setState({ loader: stableLoader, loading: true })
    stableLoader()
      .then((data) => {
        if (requestId.current === id) setState({ loader: stableLoader, data, loading: false })
      })
      .catch((e) => {
        if (requestId.current === id) {
          setState({ loader: stableLoader, error: errorText(e), loading: false })
        }
      })
  }, [stableLoader])
  const reload = useCallback(() => load(), [load])
  useEffect(() => {
    load()
    return () => { requestId.current += 1 }
  }, [load])

  // `stableLoader` zmienia się już w renderze z nowymi parametrami routingu. Nie pokazuj
  // danych należących do poprzedniego loadera w krótkim czasie przed uruchomieniem efektu.
  const visible: State = state.loader === stableLoader ? state : { loading: true }
  const setData = useCallback((data: T) => {
    requestId.current += 1
    setState({ loader: stableLoader, data, loading: false })
  }, [stableLoader])
  return { ...visible, reload, setData }
}

export function Loading({ text = 'Wczytywanie…' }: { text?: string }) {
  return <p role="status" className="hint">{text}</p>
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert alert-error" role="alert">
      <span>{message}</span>
      {onRetry && <button type="button" className="btn btn-secondary" onClick={onRetry}>Spróbuj ponownie</button>}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>
}

export function categoryName(slug: string | null): string {
  return slug ? (KATEGORIE[slug] ?? slug) : '—'
}

const STATUS: Record<StatusZgloszenia, { label: string; icon: typeof Circle }> = {
  nowe: { label: 'Nowe', icon: Circle },
  w_trakcie: { label: 'W trakcie', icon: CircleDot },
  odpowiedziane: { label: 'Odpowiedziane', icon: CheckCircle2 },
}

/** Status zawsze jako tekst i ikona, nigdy samym kolorem. */
export function StatusBadge({ status }: { status: StatusZgloszenia }) {
  const { label, icon: Icon } = STATUS[status]
  return (
    <span className={`tag tag-status-${status}`}>
      <Icon size={14} aria-hidden="true" /> {label}
    </span>
  )
}

const URGENCY: Record<Pilnosc, string> = { niska: 'Niska', srednia: 'Średnia', wysoka: 'Wysoka' }

export function UrgencyBadge({ urgency }: { urgency: Pilnosc | null }) {
  if (!urgency) return <span className="hint">Brak oceny</span>
  return (
    <span className={`tag tag-urgency-${urgency}`}>
      {urgency === 'wysoka' && <AlertTriangle size={14} aria-hidden="true" />} Pilność: {URGENCY[urgency].toLowerCase()}
    </span>
  )
}

export function hoursText(hours: number): string {
  const abs = Math.abs(hours)
  if (abs < 1) return 'mniej niż godzinę'
  if (abs < 48) return `${Math.round(abs)} godz.`
  return `${Math.round(abs / 24)} dni`
}

export function SlaBadge({ sla, answered }: { sla: Sla; answered: boolean }) {
  if (answered) return <span className="hint">Odpowiedź po {hoursText(sla.oczekuje_godzin)}</span>
  if (sla.przeterminowane) {
    return (
      <span className="tag tag-overdue">
        <AlertTriangle size={14} aria-hidden="true" /> Po terminie o {hoursText(sla.oczekuje_godzin - sla.cel_godzin)}
      </span>
    )
  }
  return (
    <span className="tag tag-ontime">
      <Clock size={14} aria-hidden="true" /> Czeka {hoursText(sla.oczekuje_godzin)}, zostało {hoursText(sla.pozostalo_godzin ?? 0)}
    </span>
  )
}

const CARD_STATUS: Record<StatusKarty, string> = {
  szkic: 'Szkic',
  opublikowana: 'Opublikowana',
  zarchiwizowana: 'Zarchiwizowana',
}

export function CardStatusBadge({ status }: { status: StatusKarty }) {
  return <span className={`tag tag-card-${status}`}>{CARD_STATUS[status]}</span>
}

export const EVIDENCE_LABELS: Record<string, string> = {
  brak_danych: 'Brak danych',
  zadeklarowany: 'Zadeklarowany (bez badań)',
  pilotaz: 'Pilotaż',
  przetestowany: 'Przetestowany',
  wdrozony: 'Wdrożony na większą skalę',
}

export const COST_LABELS: Record<string, string> = { niski: 'Niski', sredni: 'Średni', wysoki: 'Wysoki' }
export const TIME_LABELS: Record<string, string> = { dni: 'Dni', tygodnie: 'Tygodnie', miesiace: 'Miesiące' }

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })
}

export function Pagination({
  offset, limit, total, onChange,
}: { offset: number; limit: number; total: number; onChange: (offset: number) => void }) {
  if (total <= limit) return null
  const to = Math.min(offset + limit, total)
  return (
    <nav className="pagination" aria-label="Strony wyników">
      <button type="button" className="btn btn-ghost" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>
        ← Poprzednie
      </button>
      <span aria-live="polite">Pozycje {offset + 1}–{to} z {total}</span>
      <button type="button" className="btn btn-ghost" disabled={to >= total} onClick={() => onChange(offset + limit)}>
        Następne →
      </button>
    </nav>
  )
}

export function SyntheticTag() {
  return <span className="tag tag-synthetic" title="Dane demonstracyjne, wymyślone">Dane demo</span>
}
