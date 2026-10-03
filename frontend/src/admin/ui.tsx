import { useCallback, useEffect, useState, type ReactNode } from 'react'
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
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableLoader = useCallback(loader, deps)
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: undefined }))
    stableLoader()
      .then((data) => setState({ data, loading: false }))
      .catch((e) => setState((s) => ({ ...s, error: errorText(e), loading: false })))
  }, [stableLoader])
  useEffect(() => {
    let cancelled = false
    stableLoader()
      .then((data) => !cancelled && setState({ data, loading: false }))
      .catch((e) => !cancelled && setState((s) => ({ ...s, error: errorText(e), loading: false })))
    return () => {
      cancelled = true
    }
  }, [stableLoader])
  return { ...state, reload, setData: (data: T) => setState({ data, loading: false }) }
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

const STATUS: Record<StatusZgloszenia, string> = {
  nowe: 'Nowe',
  w_trakcie: 'W trakcie',
  odpowiedziane: 'Odpowiedziane',
}

/** Status zawsze tekstem; kolor ramki tylko go wspiera. */
export function StatusBadge({ status }: { status: StatusZgloszenia }) {
  return <span className={`tag tag-status-${status}`}>{STATUS[status]}</span>
}

const URGENCY: Record<Pilnosc, string> = { niska: 'Niska', srednia: 'Średnia', wysoka: 'Wysoka' }

/** Wyróżniona jest tylko wysoka pilność; pozostałe to zwykły tekst (nagłówek kolumny lub etykieta mówi, co to jest). */
export function UrgencyBadge({ urgency }: { urgency: Pilnosc | null }) {
  if (!urgency) return <span className="hint">Brak oceny</span>
  if (urgency === 'wysoka') return <span className="tag tag-urgency-wysoka">{URGENCY[urgency]}</span>
  return <span>{URGENCY[urgency]}</span>
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
    return <span className="tag tag-overdue">Po terminie o {hoursText(sla.oczekuje_godzin - sla.cel_godzin)}</span>
  }
  return <span>Czeka {hoursText(sla.oczekuje_godzin)}, zostało {hoursText(sla.pozostalo_godzin ?? 0)}</span>
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
      <button type="button" className="btn btn-ghost" aria-disabled={offset === 0 || undefined}
        onClick={() => { if (offset > 0) onChange(Math.max(0, offset - limit)) }}>
        Poprzednie
      </button>
      <span aria-live="polite">Pozycje {offset + 1}–{to} z {total}</span>
      <button type="button" className="btn btn-ghost" aria-disabled={to >= total || undefined}
        onClick={() => { if (to < total) onChange(offset + limit) }}>
        Następne
      </button>
    </nav>
  )
}

export function SyntheticTag() {
  return <span className="tag tag-synthetic" title="Dane demonstracyjne, wymyślone">Dane demo</span>
}

/**
 * Stały komunikat o wyniku akcji. Element istnieje od początku (czytnik ekranu ogłasza zmianę treści)
 * i rezerwuje jedną linię, więc pojawienie się tekstu nie przesuwa przycisków.
 */
export function StatusLine({ message, error }: { message?: string; error?: string }) {
  return (
    <div className="status-line">
      <p role="status" className="status-ok">{error ? '' : message}</p>
      {error && <p role="alert" className="field-error">{error}</p>}
    </div>
  )
}

function Bars({ count, className = 'skeleton-line' }: { count: number; className?: string }) {
  return <>{Array.from({ length: count }, (_, i) => <span key={i} className={`skeleton ${className}`} />)}</>
}

/** Szkielet tabeli: tyle wierszy, ile zwykle widać, więc tabela wchodzi na to samo miejsce. */
export function TableSkeleton({ label, rows = 6 }: { label: string; rows?: number }) {
  return (
    <div aria-busy="true">
      <p role="status" className="visually-hidden">{label}</p>
      <div className="table-wrap admin-skeleton-table" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="admin-skeleton-row">
            <span className="skeleton skeleton-line" />
            <span className="skeleton skeleton-line skeleton-short" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Szkielet strony edycji (zgłoszenie, karta, szkic z dokumentu, nabór): powrót, tytuł, pola. */
export function FormSkeleton({ label, side = false }: { label: string; side?: boolean }) {
  return (
    <div aria-busy="true">
      <p role="status" className="visually-hidden">{label}</p>
      <div className="skeleton-page" aria-hidden="true">
        <span className="skeleton skeleton-line skeleton-kicker" />
        <span className="skeleton skeleton-title" />
        <div className={side ? 'ticket-layout' : undefined}>
          <div className="skeleton-page">
            <span className="skeleton skeleton-kicker" />
            <span className="skeleton admin-skeleton-field" />
            <span className="skeleton skeleton-kicker" />
            <span className="skeleton skeleton-block" />
            <Bars count={2} />
          </div>
          {side && <div className="skeleton-page"><span className="skeleton skeleton-block" /><Bars count={3} /></div>}
        </div>
      </div>
    </div>
  )
}

/** Szkielet treści wewnątrz istniejącego panelu (podgląd karty, analiza zgłoszenia). */
export function ContentSkeleton({ label }: { label?: string }) {
  return (
    <div aria-busy="true">
      {label && <p role="status" className="visually-hidden">{label}</p>}
      <div className="skeleton-page" aria-hidden="true">
        <span className="skeleton skeleton-line skeleton-mid" />
        <Bars count={3} />
        <span className="skeleton skeleton-block" />
      </div>
    </div>
  )
}

/** Szkielet całego panelu bocznego. */
export function PanelSkeleton({ label }: { label?: string }) {
  return <div className="panel"><ContentSkeleton label={label} /></div>
}
