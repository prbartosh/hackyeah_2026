// Pomocnicze funkcje DOM silnika: szukanie elementów po data-tour, czekanie, przewijanie.

const REVEAL_TARGET = 'dostepnosc-rozwin'

export function selectorFor(target: string): string {
  return `[data-tour~="${target.replace(/"/g, '')}"]`
}

function isVisible(el: Element): boolean {
  return el.getClientRects().length > 0
}

/** Pierwszy widoczny element z data-tour (token), a gdy żaden nie jest widoczny, brak. */
export function findTarget(target: string, root: ParentNode = document): HTMLElement | null {
  const all = root.querySelectorAll<HTMLElement>(selectorFor(target))
  for (const el of all) if (isVisible(el)) return el
  return null
}

/** Wszystkie widoczne elementy celu (do wykrywania „nowego” elementu). */
export function findAllTargets(target: string, root: ParentNode = document): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(selectorFor(target))].filter(isVisible)
}

/** Cel schowany w zwiniętym pasku dostępności: kliknij przycisk rozwijania (data-tour="dostepnosc-rozwin"). */
export function revealIfCollapsed(target: string, root: ParentNode = document): void {
  if (target === REVEAL_TARGET) return
  // cel w zwiniętym <details> (np. panel „Twój problem” na telefonie): otwórz go
  for (const el of root.querySelectorAll<HTMLElement>(selectorFor(target))) {
    if (isVisible(el)) continue
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p instanceof HTMLDetailsElement && !p.open) p.open = true
    }
  }
  const toggle = findTarget(REVEAL_TARGET, root)
  if (toggle && toggle.getAttribute('aria-expanded') === 'false') toggle.click()
}

/** Czeka na widoczny element. Zwraca null po czasie lub po przerwaniu. */
export function waitForTarget(target: string, timeoutMs: number, signal?: AbortSignal): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    let done = false
    let poll = 0
    let timer = 0
    const finish = (el: HTMLElement | null) => {
      if (done) return
      done = true
      observer.disconnect()
      window.clearInterval(poll)
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      resolve(el)
    }
    const onAbort = () => finish(null)
    const observer = new MutationObserver(() => check())
    const check = () => {
      let el = findTarget(target)
      if (!el) {
        revealIfCollapsed(target)
        el = findTarget(target)
      }
      if (el) finish(el)
    }
    if (signal?.aborted) return finish(null)
    signal?.addEventListener('abort', onAbort)
    check()
    if (done) return
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'class', 'data-tour'] })
    poll = window.setInterval(check, 300)
    timer = window.setTimeout(() => finish(null), timeoutMs)
  })
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function isPhone(): boolean {
  try {
    return window.matchMedia('(max-width: 640px)').matches
  } catch {
    return false
  }
}

export function isTextField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true
  if (el instanceof HTMLInputElement) return !['button', 'submit', 'checkbox', 'radio', 'reset', 'image'].includes(el.type)
  return false
}

/** Element (albo jego rodzic) przypięty do okna, np. pasek porównania przy dolnej krawędzi: przewijanie strony go nie przesuwa. */
export function isPinned(el: HTMLElement): boolean {
  for (let p: HTMLElement | null = el; p; p = p.parentElement) {
    if (getComputedStyle(p).position === 'fixed') return true
  }
  return false
}

/** Cel przypięty do dolnej połowy ekranu zasłoniłby panel dolny na telefonie: panel idzie wtedy na górę. */
export function isPinnedLow(el: HTMLElement): boolean {
  return isPinned(el) && el.getBoundingClientRect().top > window.innerHeight * 0.5
}

/** Na telefonie panel dolny zajmuje do 52% wysokości: cel ma zostać w górnej części ekranu (do tej wysokości). */
const PHONE_LIMIT = 0.46

/** Przewija element w widok: na telefonie nad panelem dolnym, na desktopie mniej więcej do środka. */
export function scrollToTarget(el: HTMLElement): void {
  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
  if (isPinned(el)) return
  const vh = window.innerHeight
  const rect = el.getBoundingClientRect()
  if (!isPhone()) {
    el.scrollIntoView({ block: rect.height > vh * 0.7 ? 'start' : 'center', inline: 'nearest', behavior })
    return
  }
  // scrollIntoView ignoruje margines, gdy element jest już w oknie, więc liczymy przesunięcie sami
  const limit = vh * PHONE_LIMIT
  const top = 12
  let delta = 0
  if (rect.top < top) delta = rect.top - top
  else if (rect.bottom > limit) delta = Math.min(rect.bottom - limit, rect.top - top)
  if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior })
}
