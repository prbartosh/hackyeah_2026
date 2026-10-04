// Wykonawca akcji „Zrób to za mnie”: wpisuje, wybiera, klika i zapisuje wartości do ctx.
import type { TourAction, TourContext } from '@/tour/types'
import { findTarget, prefersReducedMotion, scrollToTarget, selectorFor, waitForTarget } from '@/tour/engine/dom'

export interface ActionOptions {
  signal?: AbortSignal
  /** Łączny maksymalny czas wpisywania jednego pola, ms. 0 = natychmiast (testy). */
  typingBudgetMs?: number
  /** Pauza podświetlenia przed kliknięciem, ms. */
  highlightMs?: number
  findTimeoutMs?: number
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (ms <= 0 || signal?.aborted) return resolve()
    const t = window.setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => { window.clearTimeout(t); resolve() }, { once: true })
  })

/** Ustawia value przez natywny setter, żeby React (pola kontrolowane) zauważył zmianę. */
export function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const proto = Object.getPrototypeOf(el)
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

async function resolveValue(v: string | ((ctx: TourContext) => string | Promise<string>), ctx: TourContext): Promise<string> {
  return typeof v === 'function' ? await v(ctx) : v
}

/** Element akcji albo null, gdy nie pojawił się w czasie (akcja jest wtedy pomijana bez błędu). */
async function need(action: TourAction, opts: ActionOptions): Promise<HTMLElement | null> {
  if (action.kind === 'upload') {
    // pole pliku bywa ukryte (display: none), więc nie wymagamy widoczności
    const hidden = () => document.querySelector<HTMLElement>(selectorFor(action.target))
    if (hidden()) return hidden()
    for (let i = 0; i < (opts.findTimeoutMs ?? 10000) / 100 && !opts.signal?.aborted; i++) {
      await sleep(100, opts.signal)
      if (hidden()) return hidden()
    }
    return null
  }
  return findTarget(action.target) ?? (await waitForTarget(action.target, opts.findTimeoutMs ?? 10000, opts.signal))
}

async function upload(el: HTMLElement, url: string, filename: string): Promise<void> {
  const input = el instanceof HTMLInputElement && el.type === 'file' ? el : el.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('Nie znaleziono pola wyboru pliku.')
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Nie udało się pobrać pliku demonstracyjnego (${response.status}).`)
  const blob = await response.blob()
  const dt = new DataTransfer()
  dt.items.add(new File([blob], filename, { type: blob.type }))
  input.files = dt.files
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

async function waitEnabled(el: HTMLElement, opts: ActionOptions): Promise<void> {
  const disabled = () => (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true'
  for (let i = 0; i < 30 && disabled() && !opts.signal?.aborted; i++) await sleep(100, opts.signal)
}

async function pulse(el: HTMLElement, ms: number, signal?: AbortSignal) {
  el.setAttribute('data-tour-acting', '')
  await sleep(ms, signal)
  el.removeAttribute('data-tour-acting')
}

export function extract(el: HTMLElement, from: 'href' | 'text' | 'value', pattern?: string): string {
  let raw: string
  if (from === 'href') raw = el.getAttribute('href') ?? (el as HTMLAnchorElement).href ?? ''
  else if (from === 'value') raw = (el as HTMLInputElement).value ?? ''
  else raw = (el.textContent ?? '').trim()
  if (!pattern) return raw
  const m = new RegExp(pattern).exec(raw)
  if (!m) throw new Error(`Wartość „${raw.slice(0, 60)}” nie pasuje do wzorca ${pattern}.`)
  return m[1] ?? m[0]
}

/** Zwraca false, gdy elementu nie ma (akcja pominięta). */
export async function runAction(action: TourAction, ctx: TourContext, opts: ActionOptions = {}): Promise<boolean> {
  const el = await need(action, opts)
  if (!el) return false
  await perform(action, el, ctx, opts)
  return true
}

async function perform(action: TourAction, el: HTMLElement, ctx: TourContext, opts: ActionOptions): Promise<void> {
  const smooth = !prefersReducedMotion()
  switch (action.kind) {
    case 'fill': {
      const text = await resolveValue(action.value, ctx)
      scrollToTarget(el)
      const field = el as HTMLInputElement | HTMLTextAreaElement
      const budget = opts.typingBudgetMs ?? 1600
      const delay = budget === 0 || !smooth ? 0 : Math.max(4, Math.min(30, budget / Math.max(text.length, 1)))
      if (delay === 0) {
        setNativeValue(field, text)
      } else {
        setNativeValue(field, '')
        for (let i = 1; i <= text.length && !opts.signal?.aborted; i++) {
          setNativeValue(field, text.slice(0, i))
          await sleep(delay, opts.signal)
        }
        if (opts.signal?.aborted) return
      }
      field.dispatchEvent(new Event('change', { bubbles: true }))
      return
    }
    case 'select': {
      const wanted = await resolveValue(action.value, ctx)
      const select = el as HTMLSelectElement
      const option = [...select.options].find((o) => o.value === wanted) ?? [...select.options].find((o) => o.textContent?.trim() === wanted)
      if (!option) throw new Error(`Brak opcji „${wanted}” w polu wyboru.`)
      setNativeValue(select, option.value)
      select.dispatchEvent(new Event('change', { bubbles: true }))
      return
    }
    case 'check': {
      const input = el as HTMLInputElement
      const desired = action.checked ?? true
      if (input.checked !== desired) input.click()
      return
    }
    case 'click': {
      scrollToTarget(el)
      await pulse(el, opts.highlightMs ?? (smooth ? 450 : 0), opts.signal)
      if (opts.signal?.aborted) return
      await waitEnabled(el, opts)
      el.click()
      return
    }
    case 'upload': {
      await upload(el, action.url, action.filename)
      return
    }
    case 'capture': {
      ctx.set(action.key, extract(el, action.from, action.pattern))
      return
    }
  }
}

export async function runActions(actions: TourAction[], ctx: TourContext, opts: ActionOptions = {}): Promise<void> {
  // Pierwszy cel jest zwykle już na stronie (krótkie czekanie: nieobecny = pominięty), kolejne mogą pojawić się chwilę po poprzedniej akcji.
  for (const [i, a] of actions.entries()) {
    if (opts.signal?.aborted) return
    const findTimeoutMs = opts.findTimeoutMs ?? (i === 0 ? 3000 : 10000)
    if (await runAction(a, ctx, { ...opts, findTimeoutMs })) await sleep(opts.highlightMs === 0 ? 0 : 120, opts.signal)
  }
}

/** Zapisuje wartości z akcji `capture`, jeśli ich elementy jeszcze istnieją (przy opuszczaniu kroku). Błędy ignoruje. */
export function captureQuietly(actions: TourAction[] | undefined, ctx: TourContext): void {
  for (const a of actions ?? []) {
    if (a.kind !== 'capture') continue
    const el = findTarget(a.target)
    if (!el) continue
    try {
      ctx.set(a.key, extract(el, a.from, a.pattern))
    } catch {
      /* brak dopasowania: zostaje poprzednia wartość */
    }
  }
}
