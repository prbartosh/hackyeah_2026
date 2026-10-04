import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, List, Minus, Sparkles, X } from 'lucide-react'
import type { Placement } from '@floating-ui/dom'
import type { TourChapter, TourStep } from '@/tour/types'
import type { Phase } from '@/tour/engine/runner'
import { isTextField } from '@/tour/engine/dom'
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

function toPlacement(p: TourStep['placement']): Placement {
  return !p || p === 'auto' ? 'bottom' : p
}

export default function Bubble(props: BubbleProps) {
  const { chapter, step, index, total, phase, anchor, mode, phone, acting, actionError } = props
  const titleRef = useRef<HTMLHeadingElement>(null)
  const focusedFor = useRef<string>('')
  const [floatingEl, setFloatingEl] = useState<HTMLDivElement | null>(null)
  const [arrowEl, setArrowEl] = useState<HTMLDivElement | null>(null)

  const anchored = mode === 'anchored' && !phone
  const pos = usePosition(anchored ? anchor : null, floatingEl, arrowEl, toPlacement(step.placement), anchored)

  const isLogin = phase.kind === 'login'
  const settled = phase.kind !== 'loading' && phase.kind !== 'waiting'
  const isLast = index === total - 1
  const hasAdvance = !!step.advanceOn

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
  const style = anchored ? (pos ? { left: pos.x, top: pos.y } : { left: 0, top: 0, visibility: 'hidden' as const }) : undefined
  const classes = ['tour-bubble', `tour-bubble--${phone ? 'sheet' : mode}`, pending && phase.kind === 'loading' ? 'tour-bubble--delayed' : ''].filter(Boolean).join(' ')

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
      {anchored && (
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
          <button type="button" className="tour-icon-btn" onClick={props.onMenu} aria-label="Rozdziały" title="Rozdziały"><List size={20} aria-hidden="true" /></button>
          <button type="button" className="tour-icon-btn" onClick={props.onMinimize} aria-label="Zminimalizuj przewodnik" title="Zminimalizuj (Esc)"><Minus size={20} aria-hidden="true" /></button>
          <button type="button" className="tour-icon-btn" onClick={props.onClose} aria-label="Zamknij przewodnik" title="Zamknij"><X size={20} aria-hidden="true" /></button>
        </div>
      </div>

      <div className="tour-scroll">
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
        {hasAdvance && phase.kind === 'ready' && <p className="tour-advance">Wykonaj to na stronie, a przewodnik przejdzie dalej sam.</p>}
      </div>

      <div className="tour-foot">
        <button type="button" className="btn btn-ghost tour-btn" onClick={props.onBack} disabled={index === 0}>
          <ArrowLeft size={18} aria-hidden="true" /> Wstecz
        </button>
        {step.actions && step.actions.length > 0 && phase.kind === 'ready' && (
          <button type="button" className="btn btn-secondary tour-btn" onClick={props.onAct} disabled={acting} aria-busy={acting}>
            <Sparkles size={18} aria-hidden="true" /> {acting ? 'Robię…' : 'Zrób to za mnie'}
          </button>
        )}
        {phase.kind === 'missing' || phase.kind === 'error' ? (
          <button type="button" className="btn btn-ghost tour-btn" onClick={props.onRetry}>Spróbuj ponownie</button>
        ) : null}
        <button
          type="button"
          className={`btn tour-btn tour-btn--next ${phase.kind === 'ready' && !hasAdvance ? 'btn-primary' : isLast && phase.kind === 'ready' ? 'btn-primary' : phase.kind === 'missing' || phase.kind === 'error' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={props.onNext}
        >
          {phase.kind === 'ready'
            ? isLast ? <><Check size={18} aria-hidden="true" /> Zakończ rozdział</> : hasAdvance ? 'Pomiń krok' : <>Dalej <ArrowRight size={18} aria-hidden="true" /></>
            : 'Pomiń krok'}
        </button>
      </div>
    </div>
  )
}
