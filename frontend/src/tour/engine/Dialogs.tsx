import { useEffect, useRef, type ReactNode } from 'react'
import { Check, Clock, Compass, Play, X } from 'lucide-react'
import type { TourChapter } from '@/tour/types'
import type { Progress } from '@/tour/engine/store'

function Modal({ labelId, onClose, children }: { labelId: string; onClose(): void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open && typeof d.showModal === 'function') d.showModal()
    return () => { if (d?.open) d.close() }
  }, [])
  return (
    <dialog
      ref={ref}
      className="tour-modal"
      aria-labelledby={labelId}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
    >
      <div className="tour-modal-inner">
        <button type="button" className="tour-icon-btn tour-modal-close" onClick={onClose} aria-label="Zamknij okno">
          <X size={20} aria-hidden="true" />
        </button>
        {children}
      </div>
    </dialog>
  )
}

export interface MenuProps {
  chapters: TourChapter[]
  progress: Progress
  onStart(chapterId: string): void
  onFromBeginning(): void
  onContinue(): void
  onClose(): void
}

export function MenuDialog({ chapters, progress, onStart, onFromBeginning, onContinue, onClose }: MenuProps) {
  const last = progress.last
  const lastChapter = last ? chapters.find((c) => c.id === last.chapterId) : undefined
  const totalMinutes = chapters.filter((c) => c.steps.length > 0).reduce((s, c) => s + c.minutes, 0)
  return (
    <Modal labelId="tour-menu-title" onClose={onClose}>
      <p className="tour-modal-kicker"><Compass size={18} aria-hidden="true" /> Przewodnik po platformie</p>
      <h2 id="tour-menu-title" className="tour-modal-title">Poznaj Splot na żywo</h2>
      <p className="tour-modal-lead">
        Przejdziemy przez wszystkie funkcje platformy: prawdziwy czat z AI, prawdziwe formularze i panel ROPS. Chmurki pokażą, co jest czym, a przycisk „Zrób to za mnie” wykona krok za Ciebie. Całość zajmuje ok. {totalMinutes} min, możesz przerwać w dowolnym momencie i wrócić.
      </p>
      <div className="btn-row tour-modal-actions">
        <button type="button" className="btn btn-primary" onClick={onFromBeginning}><Play size={18} aria-hidden="true" /> Zacznij od początku</button>
        {last && lastChapter && (
          <button type="button" className="btn btn-secondary" onClick={onContinue}>
            Kontynuuj od kroku {last.stepIndex + 1}
            <span className="tour-continue-sub">({lastChapter.title})</span>
          </button>
        )}
      </div>
      <h3 className="tour-modal-sub">Rozdziały</h3>
      <ul className="tour-cards">
        {chapters.map((c) => {
          const done = progress.completed.includes(c.id)
          const empty = c.steps.length === 0
          return (
            <li key={c.id}>
              <button type="button" className="tour-card" onClick={() => onStart(c.id)} disabled={empty}>
                <span className="tour-card-top">
                  {c.module && <span className="tour-chip">{c.module}</span>}
                  {done && <span className="tour-chip tour-chip--done"><Check size={14} aria-hidden="true" /> Ukończony</span>}
                  {empty && <span className="tour-chip">Wkrótce</span>}
                </span>
                <span className="tour-card-title">{c.title}</span>
                <span className="tour-card-summary">{c.summary}</span>
                <span className="tour-card-meta"><Clock size={14} aria-hidden="true" /> {c.minutes} min · {c.steps.length} {c.steps.length === 1 ? 'krok' : 'kroków'}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}

export function ChapterDoneDialog({ chapter, next, onNext, onMenu, onClose }: {
  chapter: TourChapter
  next: TourChapter | undefined
  onNext(): void
  onMenu(): void
  onClose(): void
}) {
  return (
    <Modal labelId="tour-done-title" onClose={onClose}>
      <p className="tour-modal-kicker"><Check size={18} aria-hidden="true" /> Rozdział ukończony</p>
      <h2 id="tour-done-title" className="tour-modal-title">{chapter.title}</h2>
      {next && <p className="tour-modal-lead">Dalej: <strong>{next.title}</strong>. {next.summary}</p>}
      <div className="btn-row tour-modal-actions">
        {next && <button type="button" className="btn btn-primary" onClick={onNext}>Następny rozdział (ok. {next.minutes} min)</button>}
        <button type="button" className="btn btn-secondary" onClick={onMenu}>Wszystkie rozdziały</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Zakończ na dziś</button>
      </div>
    </Modal>
  )
}

export function SummaryDialog({ done, total, onFromBeginning, onMenu, onClose }: {
  done: number
  total: number
  onFromBeginning(): void
  onMenu(): void
  onClose(): void
}) {
  return (
    <Modal labelId="tour-summary-title" onClose={onClose}>
      <p className="tour-modal-kicker"><Check size={18} aria-hidden="true" /> Koniec przewodnika</p>
      <h2 id="tour-summary-title" className="tour-modal-title">To już cały Splot</h2>
      <p className="tour-modal-lead">
        Ukończone rozdziały: {done} z {total}. Do przewodnika można wrócić w każdej chwili przyciskiem „Przewodnik” w nagłówku albo adresem z dopiskiem <code>?przewodnik=1</code>.
      </p>
      <div className="btn-row tour-modal-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>Zamknij</button>
        <button type="button" className="btn btn-secondary" onClick={onMenu}>Wybierz rozdział</button>
        <button type="button" className="btn btn-ghost" onClick={onFromBeginning}>Zacznij od początku</button>
      </div>
    </Modal>
  )
}
