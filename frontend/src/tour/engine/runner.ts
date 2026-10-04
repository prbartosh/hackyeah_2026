// Przygotowanie kroku: logowanie w panelu, prepare, trasa, czekanie na elementy, przewinięcie.
import type { TourContext, TourStep } from '@/tour/types'
import { samePlace } from '@/tour/engine/steps'

export const TARGET_TIMEOUT_MS = 8000
export const WAIT_FOR_TIMEOUT_MS = 90000
export const LOGIN_TARGET = 'panel-logowanie'
const PREPARED_PREFIX = '__prepared.'

export type Phase =
  | { kind: 'loading' }
  | { kind: 'login' }
  | { kind: 'waiting'; message: string; timeoutMs: number }
  | { kind: 'ready' }
  | { kind: 'missing'; reason: string }
  | { kind: 'error'; message: string }

export interface RunnerDeps {
  ctx: TourContext
  getPath(): string
  navigate(to: string): void
  hasToken(): boolean
  /** Logowanie do panelu bez formularza (stack demo). true = token ustawiony, false = poproś o zalogowanie. */
  autoLogin?(): Promise<boolean>
  setPhase(phase: Phase): void
  waitForTarget(target: string, timeoutMs: number, signal: AbortSignal): Promise<HTMLElement | null>
  scrollTo(el: HTMLElement): void
  sleep(ms: number, signal: AbortSignal): Promise<void>
  /** Czas między kolejnymi sprawdzeniami tokenu panelu. */
  tokenPollMs?: number
}

export async function waitForToken(deps: RunnerDeps, signal: AbortSignal): Promise<boolean> {
  while (!deps.hasToken()) {
    if (signal.aborted) return false
    await deps.sleep(deps.tokenPollMs ?? 400, signal)
  }
  return true
}

/** Uruchamia kroki przygotowawcze i kończy ze stanem `ready` albo `missing`/`error`. Przerwanie (signal) kończy po cichu. */
export async function runStep(step: TourStep, deps: RunnerDeps, signal: AbortSignal): Promise<void> {
  // StrictMode i szybkie zmiany kroku: pierwszy tick pozwala przerwać zanim ruszą efekty uboczne (prepare).
  await Promise.resolve()
  if (signal.aborted) return
  deps.setPhase({ kind: 'loading' })
  try {
    if (step.admin && !deps.hasToken() && deps.autoLogin) {
      await deps.autoLogin().catch(() => false)
      if (signal.aborted) return
    }
    if (step.admin && !deps.hasToken()) {
      if (!samePlace(deps.getPath(), '/admin')) deps.navigate('/admin')
      deps.setPhase({ kind: 'login' })
      if (!(await waitForToken(deps, signal))) return
      deps.setPhase({ kind: 'loading' })
    }

    if (step.prepare) {
      const key = `${PREPARED_PREFIX}${step.id}`
      if (!deps.ctx.get(key)) {
        await step.prepare(deps.ctx)
        if (signal.aborted) return
        deps.ctx.set(key, '1')
      }
    }

    if (step.route) {
      const route = typeof step.route === 'function' ? await step.route(deps.ctx) : step.route
      if (signal.aborted) return
      if (!samePlace(deps.getPath(), route)) deps.navigate(route)
    }

    if (step.waitFor) {
      const timeoutMs = step.waitFor.timeoutMs ?? WAIT_FOR_TIMEOUT_MS
      deps.setPhase({ kind: 'waiting', message: step.waitFor.message ?? 'Czekam, aż strona będzie gotowa…', timeoutMs })
      const found = await deps.waitForTarget(step.waitFor.target, timeoutMs, signal)
      if (signal.aborted) return
      if (!found) {
        deps.setPhase({ kind: 'missing', reason: 'Nie doczekałem się odpowiedzi. Możesz iść dalej albo spróbować ponownie.' })
        return
      }
    }

    if (step.target) {
      const el = await deps.waitForTarget(step.target, TARGET_TIMEOUT_MS, signal)
      if (signal.aborted) return
      if (!el) {
        deps.setPhase({ kind: 'missing', reason: 'Tego elementu nie widać teraz na stronie (może być niedostępny w tej przeglądarce). Możesz spokojnie iść dalej.' })
        return
      }
      deps.scrollTo(el)
    }
    deps.setPhase({ kind: 'ready' })
  } catch (e) {
    if (signal.aborted) return
    deps.setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'Nie udało się przygotować kroku.' })
  }
}
