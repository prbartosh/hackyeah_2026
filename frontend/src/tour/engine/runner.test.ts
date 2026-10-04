import { describe, expect, it } from 'vitest'
import { runStep, type Phase, type RunnerDeps } from '@/tour/engine/runner'
import type { TourContext, TourStep } from '@/tour/types'

function setup(over: Partial<RunnerDeps> = {}) {
  const store: Record<string, string> = {}
  const ctx: TourContext = { get: (k) => store[k], set: (k, v) => { store[k] = v }, api: async () => undefined as never }
  const log: string[] = []
  const phases: Phase[] = []
  let path = '/'
  let token = false
  const deps: RunnerDeps = {
    ctx,
    getPath: () => path,
    navigate: (to) => { log.push(`nav:${to}`); path = to },
    hasToken: () => token,
    setPhase: (p) => phases.push(p),
    waitForTarget: async (t) => ({ t } as unknown as HTMLElement),
    scrollTo: () => log.push('scroll'),
    sleep: async () => { token = true },
    tokenPollMs: 0,
    ...over,
  }
  return { deps, log, phases, store, setPath: (p: string) => { path = p } }
}
const base: TourStep = { id: 'x.1', title: 't', body: ['b'] }

describe('runStep', () => {
  it('prepare, trasa z funkcji, przewinięcie i ready', async () => {
    const { deps, log, phases } = setup()
    await runStep({ ...base, target: 'el', prepare: async (c) => { c.set('id', '7') }, route: async (c) => `/w/${c.get('id')}` }, deps, new AbortController().signal)
    expect(log).toEqual(['nav:/w/7', 'scroll'])
    expect(phases.at(-1)).toEqual({ kind: 'ready' })
  })

  it('nie nawiguje, gdy trasa jest już bieżąca; prepare uruchamia się raz', async () => {
    const { deps, log, setPath } = setup()
    setPath('/czat')
    let calls = 0
    const step = { ...base, route: '/czat', prepare: async () => { calls++ } }
    await runStep(step, deps, new AbortController().signal)
    await runStep(step, deps, new AbortController().signal)
    expect(log).toEqual([])
    expect(calls).toBe(1)
  })

  it('brak elementu: stan missing, nie martwy punkt', async () => {
    const { deps, phases } = setup({ waitForTarget: async () => null })
    await runStep({ ...base, target: 'nie-ma' }, deps, new AbortController().signal)
    expect(phases.at(-1)?.kind).toBe('missing')
  })

  it('krok panelu bez tokenu: /admin, login, potem kontynuacja', async () => {
    const { deps, log, phases } = setup()
    await runStep({ ...base, admin: true, route: '/admin/karty', target: 'el' }, deps, new AbortController().signal)
    expect(log.slice(0, 2)).toEqual(['nav:/admin', 'nav:/admin/karty'])
    expect(phases.map((p) => p.kind)).toContain('login')
    expect(phases.at(-1)?.kind).toBe('ready')
  })

  it('krok panelu z autoLogin: bez formularza logowania', async () => {
    let token = false
    const { deps, log, phases } = setup({ hasToken: () => token, autoLogin: async () => { token = true; return true } })
    await runStep({ ...base, admin: true, route: '/admin/karty', target: 'el' }, deps, new AbortController().signal)
    expect(log[0]).toBe('nav:/admin/karty')
    expect(phases.map((p) => p.kind)).not.toContain('login')
    expect(phases.at(-1)?.kind).toBe('ready')
  })

  it('autoLogin wyłączony (błąd): zwykła prośba o zalogowanie', async () => {
    const { deps, phases } = setup({ autoLogin: async () => { throw new Error('404') } })
    await runStep({ ...base, admin: true, target: 'el' }, deps, new AbortController().signal)
    expect(phases.map((p) => p.kind)).toContain('login')
    expect(phases.at(-1)?.kind).toBe('ready')
  })

  it('waitFor pokazuje oczekiwanie, a błąd prepare daje stan error', async () => {
    const a = setup()
    await runStep({ ...base, waitFor: { target: 'odp', message: 'Model myśli' } }, a.deps, new AbortController().signal)
    expect(a.phases.some((p) => p.kind === 'waiting' && p.message === 'Model myśli')).toBe(true)
    const b = setup()
    await runStep({ ...base, prepare: async () => { throw new Error('boom') } }, b.deps, new AbortController().signal)
    expect(b.phases.at(-1)).toEqual({ kind: 'error', message: 'boom' })
  })

  it('przerwanie nie uruchamia prepare', async () => {
    const { deps } = setup()
    const ac = new AbortController()
    let called = false
    const p = runStep({ ...base, prepare: async () => { called = true } }, deps, ac.signal)
    ac.abort()
    await p
    expect(called).toBe(false)
  })
})
