// Stan przewodnika: bieżący rozdział i krok (sessionStorage), ukończone rozdziały i ostatnia pozycja (localStorage).
import type { TourChapter } from '@/tour/types'
import { findStep, isValidPosition, nextChapter, playable } from '@/tour/engine/steps'
import { readJson, removeKey, writeJson } from '@/tour/engine/storage'

export const STATE_KEY = 'tour-state'
export const PROGRESS_KEY = 'tour-progress'

export type Screen = 'closed' | 'step' | 'chapterDone' | 'summary'

export interface TourState {
  screen: Screen
  chapterId: string | null
  stepIndex: number
  minimized: boolean
  /** Okno ze spisem rozdziałów (ekran startowy) nad wszystkim innym. */
  menuOpen: boolean
}

export interface Progress {
  completed: string[]
  last: { chapterId: string; stepIndex: number } | null
}

export interface TourStore {
  getState(): TourState
  subscribe(listener: () => void): () => void
  getProgress(): Progress
  openMenu(): void
  closeMenu(): void
  start(chapterId: string, stepIndex?: number): boolean
  startFromBeginning(): boolean
  next(): void
  prev(): void
  goTo(stepId: string): boolean
  minimize(): void
  restore(): void
  close(): void
}

const INITIAL: TourState = { screen: 'closed', chapterId: null, stepIndex: 0, minimized: false, menuOpen: false }

export function createTourStore(chapters: TourChapter[]): TourStore {
  let progress: Progress = readProgress()
  let state: TourState = restore()
  const listeners = new Set<() => void>()

  function readProgress(): Progress {
    const raw = readJson<Partial<Progress>>('local', PROGRESS_KEY)
    const completed = Array.isArray(raw?.completed) ? raw.completed.filter((x) => typeof x === 'string') : []
    const last = raw?.last && typeof raw.last.chapterId === 'string' ? raw.last : null
    return { completed, last: last && isValidPosition(chapters, last.chapterId, last.stepIndex) ? last : null }
  }

  function restore(): TourState {
    const saved = readJson<Partial<TourState>>('session', STATE_KEY)
    if (saved?.screen === 'step' && isValidPosition(chapters, saved.chapterId ?? null, saved.stepIndex ?? -1)) {
      return { ...INITIAL, screen: 'step', chapterId: saved.chapterId!, stepIndex: saved.stepIndex!, minimized: !!saved.minimized }
    }
    return INITIAL
  }

  function set(patch: Partial<TourState>) {
    state = { ...state, ...patch }
    if (state.screen === 'step') {
      writeJson('session', STATE_KEY, { screen: 'step', chapterId: state.chapterId, stepIndex: state.stepIndex, minimized: state.minimized })
    } else {
      removeKey('session', STATE_KEY)
    }
    listeners.forEach((l) => l())
  }

  function saveProgress(patch: Partial<Progress>) {
    progress = { ...progress, ...patch }
    writeJson('local', PROGRESS_KEY, progress)
  }

  function chapter() {
    return chapters.find((c) => c.id === state.chapterId)
  }

  function enter(chapterId: string, stepIndex: number) {
    saveProgress({ last: { chapterId, stepIndex } })
    set({ screen: 'step', chapterId, stepIndex, minimized: false, menuOpen: false })
  }

  return {
    getState: () => state,
    getProgress: () => progress,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    openMenu: () => set({ menuOpen: true }),
    closeMenu: () => set({ menuOpen: false }),
    start(chapterId, stepIndex = 0) {
      if (!isValidPosition(chapters, chapterId, stepIndex)) return false
      enter(chapterId, stepIndex)
      return true
    },
    startFromBeginning() {
      const first = playable(chapters)[0]
      if (!first) return false
      saveProgress({ completed: [], last: null })
      enter(first.id, 0)
      return true
    },
    next() {
      const c = chapter()
      if (state.screen !== 'step' || !c) return
      if (state.stepIndex < c.steps.length - 1) {
        enter(c.id, state.stepIndex + 1)
        return
      }
      const completed = progress.completed.includes(c.id) ? progress.completed : [...progress.completed, c.id]
      saveProgress({ completed, last: null })
      try { c.onFinish?.() } catch { /* sprzątanie nie może zablokować przewodnika */ }
      set({ screen: nextChapter(chapters, c.id) ? 'chapterDone' : 'summary', minimized: false })
    },
    prev() {
      const c = chapter()
      if (state.screen === 'step' && c && state.stepIndex > 0) enter(c.id, state.stepIndex - 1)
    },
    goTo(stepId) {
      const ref = findStep(chapters, stepId)
      if (!ref) return false
      enter(ref.chapter.id, ref.stepIndex)
      return true
    },
    minimize: () => state.screen === 'step' && set({ minimized: true }),
    restore: () => state.screen === 'step' && set({ minimized: false }),
    close: () => set({ screen: 'closed', menuOpen: false, minimized: false }),
  }
}
