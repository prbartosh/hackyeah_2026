import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, List, Minus, Sparkles, X } from 'lucide-react'
import type { Placement } from '@floating-ui/dom'
import type { TourChapter, TourStep } from '@/tour/types'
import type { Phase } from '@/tour/engine/runner'
import { isPinnedLow, isTextField } from '@/tour/engine/dom'
import { arrowStyle, usePosition } from '@/tour/engine/usePosition'

export type BubbleMode = 'anchored' | 'center' | 'dock'

export interface BubbleProps {
  chapter: TourChapter
  step: TourStep
  index: number
  total: number
  phase: Phase
  anchor: HTMLElement | null
  mode: BubbleMode
  phone: boolean
  acting: boolean
  actionError: string
  onNext(): void
  onBack(): void
  onRetry(): void
  onAct(): void
  onMinimize(): void
  onClose(): void
  onMenu(): void
}

function Elapsed({ timeoutMs }: { timeoutMs: number }) {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setSec((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [])
  return <span className="tour-elapsed">{sec} s z {Math.round(timeoutMs / 1000)} s</span>
}

const COVER_LIMIT = 0.3

function overlap(a: DOMRect, b: { left: number; top: number; right: number; bottom: number }): number {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
}

/** Narożnik ekranu, w którym chmurka najmniej zasłania cel; null, gdy obecne miejsce jest dobre. */
function cornerAway(anchor: HTMLElement, bubble: HTMLElement): { x: number; y: number } | null {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const r = anchor.getBoundingClientRect()
  const target = { left: Math.max(r.left, 0), top: Math.max(r.top, 0), right: Math.min(r.right, vw), bottom: Math.min(r.bottom, vh) }
  const area = Math.max(0, target.right - target.left) * Math.max(0, target.bottom - target.top)
  if (area === 0) return null
  const b = bubble.getBoundingClientRect()
  const now = overlap(b, target) / area
  if (now <= COVER_LIMIT) return null
  const m = 16
  const corners = [
    { x: vw - b.width - m, y: vh - b.height - m },
    { x: m, y: vh - b.height - m },
    { x: vw - b.width - m, y: m },
    { x: m, y: m },
  ]
  let best: { x: number; y: number } | null = null
  let bestOverlap = now - 0.1
  for (const c of corners) {
    const o = overlap(new DOMRect(c.x, c.y, b.width, b.height), target) / area
    if (o < bestOverlap) { best = c; bestOverlap = o }
  }
  return best
}

function toPlacement(p: TourStep['placement']): Placement {
  return !p || p === 'auto' ? 'bottom' : p
}

export default function Bubble(props: BubbleProps) {
  const { chapter, step, index, total, phase, anchor, mode, phone, acting, actionError } = props
  const titleRef = useRef<HTMLHeadingElement>(null)
  const focusedFor = useRef<string>('')
  const [floatingEl, setFloatingEl] = useState<HTMLDivElement | null>(null)
  const [arrowEl, setArrowEl] = useState<HTMLDivElement | null>(null)
  // Przewijana treść kroku musi dać się przewinąć klawiaturą (WCAG 2.1.1), ale bez zbędnego przystanku, gdy się mieści.
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const [scrollable, setScrollable] = useState(false)
  useEffect(() => {
    if (!scrollEl) return
    const check = () => setScrollable(scrollEl.scrollHeight > scrollEl.clientHeight + 1)
    check()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(check)
    ro.observe(scrollEl)
    if (scrollEl.firstElementChild) ro.observe(scrollEl.firstElementChild)
    return () => ro.disconnect()
  }, [scrollEl, step.id, phase.kind])

  const anchored = mode === 'anchored' && !phone
  const [pinnedLow, setPinnedLow] = useState(false)
  useEffect(() => { setPinnedLow(phone && mode === 'anchored' && !!anchor && isPinnedLow(anchor)) }, [phone, mode, anchor, step.id])
  // Gdy chmurka przy celu zasłania go w dużej części, przenosimy ją w narożnik ekranu (po ustabilizowaniu układu).
  const [moved, setMoved] = useState<{ x: number; y: number } | null>(null)
  const follows = anchored && !moved
  const pos = usePosition(follows ? anchor : null, floatingEl, arrowEl, toPlacement(step.placement), follows)
  useEffect(() => setMoved(null), [step.id])
  useEffect(() => {
    if (!follows || !pos || !floatingEl || !anchor) return
    const timer = window.setTimeout(() => setMoved(cornerAway(anchor, floatingEl)), 500)
    return () => window.clearTimeout(timer)
  }, [follows, pos, floatingEl, anchor])

  const isLogin = phase.kind === 'login'
  const settled = phase.kind !== 'loading' && phase.kind !== 'waiting'
  const isLast = index === total - 1
  const hasAdvance = !!step.advanceOn
  const strict = !!chapter.strict
  // Tryb bez pomijania: „Dalej” tylko w gotowym kroku do przeczytania, nigdy „Pomiń krok”.
  const showNext = !strict || (phase.kind === 'ready' && !hasAdvance)

  // Fokus na tytule przy zmianie kroku, ale nigdy z pola tekstowego strony (np. po wpisaniu przez „Zrób to za mnie”).
  useEffect(() => {
    const key = `${step.id}:${isLogin ? 'login' : 'step'}`
    if (!settled || focusedFor.current === key) return
    focusedFor.current = key
    if (isTextField(document.activeElement)) return
    titleRef.current?.focus({ preventScroll: true })
  }, [step.id, settled, isLogin])

  const title = isLogin ? 'Zaloguj się do panelu' : step.title
  const body = isLogin
    ? ['Ten krok pokazuje panel pracownika ROPS. Wpisz token dostępu w formularzu poniżej i kliknij „Zaloguj”. Przewodnik poczeka i pójdzie dalej sam.']
    : step.body
  const pending = phase.kind === 'loading' || phase.kind === 'waiting'
  const style = moved ? { left: moved.x, top: moved.y } : anchored ? (pos ? { left: pos.x, top: pos.y } : { left: 0, top: 0, visibility: 'hidden' as const }) : undefined
  const classes = ['tour-bubble', `tour-bubble--${phone ? 'sheet' : mode}`, phone && pinnedLow ? 'tour-bubble--top' : '', pending && phase.kind === 'loading' ? 'tour-bubble--delayed' : ''].filter(Boolean).join(' ')

  return (
    <div
      ref={setFloatingEl}
      className={classes}
      style={style}
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-title"
      aria-describedby="tour-body"
      data-phase={phase.kind}
      data-step={step.id}
    >
      {follows && (
        <div
          ref={setArrowEl}
          className={`tour-arrow${pos ? ` tour-arrow--${pos.placement.split('-')[0]}` : ''}`}
          style={pos ? arrowStyle(pos) : undefined}
          aria-hidden="true"
        />
      )}

      <div className="tour-head">
        <div className="tour-progress-wrap">
          <p className="tour-meta">{chapter.title} · krok {index + 1} z {total}</p>
          <div className="tour-progress" aria-hidden="true"><span style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
        </div>
        <div className="tour-head-actions">
          {!strict && <button type="button" className="tour-icon-btn" onClick={props.onMenu} aria-label="Rozdziały" title="Rozdziały"><List size={20} aria-hidden="true" /></button>}
          {!strict && <button type="button" className="tour-icon-btn" onClick={props.onMinimize} aria-label="Zminimalizuj przewodnik" title="Zminimalizuj (Esc)"><Minus size={20} aria-hidden="true" /></button>}
          <button type="button" className="tour-icon-btn" onClick={props.onClose} aria-label="Zamknij przewodnik" title="Zamknij"><X size={20} aria-hidden="true" /></button>
        </div>
      </div>

      <div className="tour-scroll" ref={setScrollEl} {...(scrollable ? { tabIndex: 0, role: 'region', 'aria-label': 'Treść kroku, przewijana strzałkami' } : {})}>
        {step.tag && !isLogin && <p className="tour-tag">{step.tag}</p>}
        <h2 id="tour-title" className="tour-title" tabIndex={-1} ref={titleRef}>{title}</h2>
        <div id="tour-body" className="tour-body">
          {body.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        {phase.kind === 'loading' && <p className="tour-status"><span className="tour-spinner" aria-hidden="true" /> Przygotowuję krok…</p>}
        {phase.kind === 'waiting' && (
          <p className="tour-status"><span className="tour-spinner" aria-hidden="true" /> {phase.message} <Elapsed key={step.id} timeoutMs={phase.timeoutMs} /></p>
        )}
        {isLogin && <p className="tour-status"><span className="tour-spinner" aria-hidden="true" /> Czekam na zalogowanie…</p>}
        {phase.kind === 'missing' && <p className="tour-notice tour-notice--info" role="status">{phase.reason}</p>}
        {phase.kind === 'error' && <p className="tour-notice tour-notice--error" role="alert">{phase.message}</p>}
        {actionError && <p className="tour-notice tour-notice--error" role="alert">{actionError}</p>}

        {step.hint && phase.kind === 'ready' && (
          <div className="tour-hint">
            <strong>Spróbuj:</strong> {step.hint}
          </div>
        )}
        {hasAdvance && phase.kind === 'ready' && (
          <p className="tour-advance">
            {strict ? 'Kliknij „Zrób to za mnie” albo zrób to sam na stronie. Przewodnik przejdzie dalej sam.' : 'Wykonaj to na stronie, a przewodnik przejdzie dalej sam.'}
          </p>
        )}
      </div>

      <div className="tour-foot">
        {!strict && (
          <button type="button" className="btn btn-ghost tour-btn tour-btn--back" onClick={props.onBack} disabled={index === 0}>
            <ArrowLeft size={18} aria-hidden="true" /> <span className="tour-btn-label">Wstecz</span>
          </button>
        )}
        {step.actions && step.actions.length > 0 && phase.kind === 'ready' && (
          <button type="button" className={`btn ${strict && hasAdvance ? 'btn-primary' : 'btn-secondary'} tour-btn`} onClick={props.onAct} disabled={acting} aria-busy={acting}>
            <Sparkles size={18} aria-hidden="true" /> {acting ? 'Robię…' : 'Zrób to za mnie'}
          </button>
        )}
        {phase.kind === 'missing' || phase.kind === 'error' ? (
          <button type="button" className="btn btn-ghost tour-btn" onClick={props.onRetry}>Spróbuj ponownie</button>
        ) : null}
        {showNext && (
          <button
            type="button"
            className={`btn tour-btn tour-btn--next ${phase.kind === 'ready' && !hasAdvance ? 'btn-primary' : isLast && phase.kind === 'ready' ? 'btn-primary' : phase.kind === 'missing' || phase.kind === 'error' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={props.onNext}
          >
            {phase.kind === 'ready'
              ? isLast ? <><Check size={18} aria-hidden="true" /> Zakończ rozdział</> : hasAdvance ? 'Pomiń krok' : <>Dalej <ArrowRight size={18} aria-hidden="true" /></>
              : 'Pomiń krok'}
          </button>
        )}
      </div>
    </div>
  )
}
