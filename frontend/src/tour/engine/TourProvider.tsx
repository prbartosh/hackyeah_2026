import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Compass } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getToken } from '@/admin/api'
import { chapters as defaultChapters } from '@/tour/chapters'
import type { TourChapter } from '@/tour/types'
import { captureQuietly, runActions } from '@/tour/engine/actions'
import Bubble, { type BubbleMode } from '@/tour/engine/Bubble'
import { ChapterDoneDialog, MenuDialog, SummaryDialog } from '@/tour/engine/Dialogs'
import { findAllTargets, findTarget, isPhone, isTextField, scrollToTarget, selectorFor, waitForTarget } from '@/tour/engine/dom'
import { LOGIN_TARGET, runStep, type Phase } from '@/tour/engine/runner'
import Spotlight from '@/tour/engine/Spotlight'
import { createTourStore } from '@/tour/engine/store'
import { flatSteps, nextChapter, playable } from '@/tour/engine/steps'
import { createTourContext } from '@/tour/engine/tourContext'
import { TourReactContext, type TourApi } from '@/tour/engine/tourReact'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/** Element celu na żywo: odnajdywany ponownie, gdy React podmieni węzeł albo strona się zmieni. */
function useLiveTarget(target: string | null): HTMLElement | null {
  const [el, setEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!target) {
      setEl(null)
      return
    }
    let raf = 0
    const update = () => {
      raf = 0
      const found = findTarget(target)
      setEl((prev) => (prev === found ? prev : found))
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'class'] })
    return () => {
      observer.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [target])
  return el
}

interface DebugWindow {
  __splotTour?: unknown
}

export default function TourProvider({ children, chapters: chaptersProp }: { children: ReactNode; chapters?: TourChapter[] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [chapters, setChapters] = useState<TourChapter[]>(chaptersProp ?? defaultChapters)
  const [pending, setPending] = useState<string | null>(null)
  const store = useMemo(() => createTourStore(chapters), [chapters])
  const ctx = useMemo(() => createTourContext(), [])
  const state = useSyncExternalStore(store.subscribe, store.getState)
  const progress = store.getProgress()
  const phone = useMediaQuery('(max-width: 640px)')

  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [runId, setRunId] = useState(0)
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState('')
  const [announce, setAnnounce] = useState('')
  const pillRef = useRef<HTMLButtonElement>(null)
  const navigateRef = useRef(navigate)
  const pathRef = useRef(location.pathname)
  const phaseRef = useRef(phase)
  useEffect(() => {
    navigateRef.current = navigate
    pathRef.current = location.pathname
    phaseRef.current = phase
  })

  const chapter = chapters.find((c) => c.id === state.chapterId)
  const step = state.screen === 'step' && chapter ? chapter.steps[state.stepIndex] : undefined
  const isStep = !!step

  // Tryb deweloperski: ?przewodnik=demo ładuje kroki demonstracyjne (kod usuwany z produkcji przez bundler).
  useEffect(() => {
    if (!import.meta.env.DEV || chaptersProp) return
    let flagged = false
    try { flagged = sessionStorage.getItem('tour-demo') === '1' } catch { /* noop */ }
    if (flagged) void import('@/tour/engine/devDemo').then((m) => setChapters(m.demoChapters))
  }, [chaptersProp])

  // Start z adresu: ?przewodnik=1 (ekran startowy) albo ?przewodnik=<id rozdziału>. Parametr znika z adresu.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const value = params.get('przewodnik')
    if (value === null) return
    params.delete('przewodnik')
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '', hash: location.hash }, { replace: true })
    if (import.meta.env.DEV && value === 'demo' && !chaptersProp) {
      try { sessionStorage.setItem('tour-demo', '1') } catch { /* noop */ }
      void import('@/tour/engine/devDemo').then((m) => { setChapters(m.demoChapters); setPending('1') })
      return
    }
    setPending(value)
  }, [location.search, location.pathname, location.hash, navigate, chaptersProp])

  useEffect(() => {
    if (pending === null) return
    if (pending === '1' || !store.start(pending)) store.openMenu()
    setPending(null)
  }, [pending, store])

  // Wykonanie kroku: panel, prepare, trasa, czekanie na element.
  useEffect(() => {
    if (!step) return
    const ac = new AbortController()
    setPhase({ kind: 'loading' })
    setActionError('')
    void runStep(step, {
      ctx,
      getPath: () => window.location.pathname + window.location.search,
      navigate: (to) => navigateRef.current(to),
      hasToken: () => getToken() !== null,
      setPhase: (p) => { if (!ac.signal.aborted) setPhase(p) },
      waitForTarget,
      scrollTo: scrollToTarget,
      sleep: (ms, signal) => new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, ms)
        signal.addEventListener('abort', () => { window.clearTimeout(t); resolve() }, { once: true })
      }),
    }, ac.signal)
    return () => ac.abort()
  }, [step, runId, ctx])

  const anchorName = phase.kind === 'login' ? LOGIN_TARGET : phase.kind === 'ready' ? step?.target ?? null : null
  const anchor = useLiveTarget(isStep ? anchorName : null)

  // Cel pod linią przewijania (np. wynik AI pojawia się niżej) albo zmieniający rozmiar: przewiń do niego ponownie.
  useEffect(() => {
    if (!anchor || phase.kind !== 'ready' || state.minimized) return
    const ensure = () => {
      const r = anchor.getBoundingClientRect()
      const limit = window.innerHeight * (isPhone() ? 0.5 : 1)
      if (r.bottom > limit || r.top < 0) scrollToTarget(anchor)
    }
    ensure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(ensure)
    ro.observe(anchor)
    return () => ro.disconnect()
  }, [anchor, phase.kind, state.minimized])

  // Zapowiedź dla czytnika ekranu, gdy krok jest gotowy.
  useEffect(() => {
    if (!step || !chapter) return
    if (phase.kind === 'ready') setAnnounce(`Krok ${state.stepIndex + 1} z ${chapter.steps.length}: ${step.title}`)
    else if (phase.kind === 'login') setAnnounce('Zaloguj się do panelu, żeby kontynuować.')
    else if (phase.kind === 'missing') setAnnounce(`Krok ${state.stepIndex + 1}: ${phase.reason}`)
  }, [phase, step, chapter, state.stepIndex])

  // Zmiana kroku przerywa akcje w toku.
  const actionAbort = useRef<AbortController | null>(null)
  useEffect(() => {
    setActing(false)
    return () => actionAbort.current?.abort()
  }, [step])

  // Wartości z `capture` zapisujemy też, gdy użytkownik zrobił to sam (klik w link zamiast „Zrób to za mnie”).
  const stepRef = useRef(step)
  useEffect(() => { stepRef.current = step })
  const leave = useCallback(() => captureQuietly(stepRef.current?.actions, ctx), [ctx])
  const next = useCallback(() => { leave(); store.next() }, [store, leave])
  const back = useCallback(() => store.prev(), [store])

  const act = useCallback(async () => {
    if (!step?.actions) return
    const ac = new AbortController()
    actionAbort.current = ac
    setActing(true)
    setActionError('')
    try {
      await runActions(step.actions, ctx, { signal: ac.signal })
    } catch (e) {
      if (!ac.signal.aborted) setActionError(e instanceof Error ? e.message : 'Nie udało się wykonać akcji.')
    } finally {
      if (!ac.signal.aborted) setActing(false)
    }
  }, [step, ctx])

  // advanceOn: krok sam przechodzi dalej.
  const readyPath = useRef('')
  useEffect(() => {
    if (phase.kind === 'ready') readyPath.current = pathRef.current
  }, [phase.kind, step])

  useEffect(() => {
    const adv = step?.advanceOn
    if (!adv || phase.kind !== 'ready') return
    let done = false
    const go = (delay: number) => {
      if (done) return
      done = true
      window.setTimeout(() => { leave(); store.next() }, delay)
    }
    if (adv.kind === 'click') {
      const sel = selectorFor(adv.target)
      const onClick = (e: MouseEvent) => {
        if ((e.target as Element | null)?.closest?.(sel)) { leave(); go(150) }
      }
      document.addEventListener('click', onClick, true)
      return () => document.removeEventListener('click', onClick, true)
    }
    if (adv.kind === 'appear') {
      const existing = new Set(findAllTargets(adv.target))
      let raf = 0
      const check = () => {
        raf = 0
        if (findAllTargets(adv.target).some((el) => !existing.has(el))) go(250)
      }
      const observer = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(check) })
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'class'] })
      return () => { observer.disconnect(); if (raf) cancelAnimationFrame(raf) }
    }
    return undefined
  }, [step, phase.kind, store, leave])

  // Strona może się zmienić po kliknięciu (np. link do wątku): zapisz wartości zanim element zniknie.
  useEffect(() => {
    if (phase.kind !== 'ready' || !step?.actions?.some((a) => a.kind === 'capture')) return
    document.addEventListener('click', leave, true)
    return () => document.removeEventListener('click', leave, true)
  }, [step, phase.kind, leave])

  useEffect(() => {
    const adv = step?.advanceOn
    if (adv?.kind !== 'route' || phase.kind !== 'ready') return
    if (location.pathname !== readyPath.current && location.pathname.startsWith(adv.startsWith)) { leave(); store.next() }
  }, [location.pathname, step, phase.kind, store, leave])

  // Klawiatura: Esc minimalizuje, Alt+strzałki przechodzą między krokami.
  useEffect(() => {
    if (!isStep || state.minimized || state.menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (e.key === 'Escape') {
        store.minimize()
      } else if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !isTextField(e.target)) {
        e.preventDefault()
        if (e.key === 'ArrowRight') store.next()
        else store.prev()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isStep, state.minimized, state.menuOpen, store])

  useEffect(() => {
    if (isStep && state.minimized) pillRef.current?.focus({ preventScroll: true })
  }, [isStep, state.minimized])

  // Dla testów i integracji: bez niczego wrażliwego (ctx i token nie są wystawione).
  useEffect(() => {
    const api = {
      get state() {
        const s = store.getState()
        const c = chapters.find((x) => x.id === s.chapterId)
        return { screen: s.screen, chapterId: s.chapterId, stepIndex: s.stepIndex, stepId: c?.steps[s.stepIndex]?.id ?? null, minimized: s.minimized, menuOpen: s.menuOpen, phase: phaseRef.current.kind }
      },
      get steps() { return flatSteps(chapters).map((r) => ({ id: r.step.id, chapter: r.chapter.id, title: r.step.title })) },
      goTo: (stepId: string) => store.goTo(stepId),
      next: () => store.next(),
      back: () => store.prev(),
      start: (chapterId: string) => store.start(chapterId),
      open: () => store.openMenu(),
    }
    ;(window as unknown as DebugWindow).__splotTour = api
    return () => { delete (window as unknown as DebugWindow).__splotTour }
  }, [store, chapters])

  const api = useMemo<TourApi>(() => ({ chapters, state, openMenu: () => store.openMenu() }), [chapters, state, store])

  let mode: BubbleMode = 'center'
  if (phase.kind === 'loading' || phase.kind === 'waiting') mode = 'dock'
  else if (phase.kind === 'login') mode = anchor ? 'anchored' : 'dock'
  else if (phase.kind === 'ready' && step?.target && anchor) mode = 'anchored'
  const showSpotlight = isStep && !state.minimized && (phase.kind === 'ready' || phase.kind === 'login') && !!anchor
  const finished = chapter && (state.screen === 'chapterDone' || state.screen === 'summary') ? chapter : undefined
  const active = isStep || state.menuOpen || !!finished

  const fromBeginning = () => { ctx.clear(); store.startFromBeginning() }
  const showMenuFromDone = () => { store.close(); store.openMenu() }

  return (
    <TourReactContext.Provider value={api}>
      {children}
      {active && (
        <aside className="tour-root" aria-label="Przewodnik po platformie" data-phone={phone || isPhone() ? '' : undefined}>
          <div className="visually-hidden" aria-live="polite" aria-atomic="true">{announce}</div>
          {showSpotlight && <Spotlight element={anchor} />}
          {isStep && !state.minimized && step && chapter && (
            <Bubble
              chapter={chapter}
              step={step}
              index={state.stepIndex}
              total={chapter.steps.length}
              phase={phase}
              anchor={anchor}
              mode={mode}
              phone={phone}
              acting={acting}
              actionError={actionError}
              onNext={next}
              onBack={back}
              onRetry={() => setRunId((n) => n + 1)}
              onAct={() => void act()}
              onMinimize={() => store.minimize()}
              onClose={() => store.close()}
              onMenu={() => store.openMenu()}
            />
          )}
          {isStep && state.minimized && chapter && (
            <button ref={pillRef} type="button" className="tour-pill" onClick={() => store.restore()} aria-label={`Przewodnik, krok ${state.stepIndex + 1} z ${chapter.steps.length}. Wróć do przewodnika`}>
              <Compass size={18} aria-hidden="true" />
              <span aria-hidden="true">Przewodnik · krok {state.stepIndex + 1}/{chapter.steps.length} · Wróć</span>
            </button>
          )}
          {state.menuOpen && (
            <MenuDialog
              chapters={chapters}
              progress={progress}
              onStart={(id) => store.start(id)}
              onFromBeginning={fromBeginning}
              onContinue={() => progress.last && store.start(progress.last.chapterId, progress.last.stepIndex)}
              onClose={() => store.closeMenu()}
            />
          )}
          {!state.menuOpen && state.screen === 'chapterDone' && finished && (
            <ChapterDoneDialog
              chapter={finished}
              next={nextChapter(chapters, finished.id)}
              onNext={() => { const n = nextChapter(chapters, finished.id); if (n) store.start(n.id) }}
              onMenu={showMenuFromDone}
              onClose={() => store.close()}
            />
          )}
          {!state.menuOpen && state.screen === 'summary' && finished && (
            <SummaryDialog
              done={playable(chapters).filter((c) => progress.completed.includes(c.id)).length}
              total={playable(chapters).length}
              onFromBeginning={fromBeginning}
              onMenu={showMenuFromDone}
              onClose={() => store.close()}
            />
          )}
        </aside>
      )}
    </TourReactContext.Provider>
  )
}
