#!/usr/bin/env node
// Przejście klawiaturą (Tab / Shift+Tab) po wskazanych trasach: kolejność, widoczny fokus,
// pułapki fokusu, poziomy scroll. Na końcu: wynik w konsoli i kod wyjścia 1 przy problemach.
//
//   npm run a11y:keys                                    # /wspolpraca i wątek zgłoszenia
//   BASE_URL=http://localhost:5199 A11Y_KEYS_ROUTES=/zglos,/pytania npm run a11y:keys
//
// Zmienne: BASE_URL, A11Y_KEYS_ROUTES (lista ścieżek po przecinku), A11Y_WIDTHS (1280,320).
// Wątek (/watek/:token) dostaje token nowego zgłoszenia założonego przez API.
import { chromium } from 'playwright-core'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

const BASE_URL = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '')
const WIDTHS = (process.env.A11Y_WIDTHS || '1280,320').split(',').map(Number)
const MAX_TABS = 200

function findChromium() {
  if (process.env.A11Y_CHROMIUM) return process.env.A11Y_CHROMIUM
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (!root || !existsSync(root)) return undefined
  for (const d of readdirSync(root).filter((x) => /^chromium-\d+$/.test(x)).sort().reverse()) {
    for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const p = path.join(root, d, rel)
      if (existsSync(p)) return p
    }
  }
  return undefined
}

async function routes() {
  if (process.env.A11Y_KEYS_ROUTES) return process.env.A11Y_KEYS_ROUTES.split(',')
  const r = await fetch(`${BASE_URL}/api/v1/zgloszenia`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tresc: '[a11y] dane testowe audytu, do usunięcia. Test klawiatury.', autor_nazwa: 'Audyt a11y' }),
  })
  const token = r.ok ? (await r.json()).token_watku : 'brak-tokenu'
  return ['/wspolpraca', `/watek/${token}`]
}

/** Opis aktywnego elementu: nazwa, czy fokus jest widoczny (obrys lub cień) i czy element jest w oknie. */
const describeActive = () => {
  const el = document.activeElement
  if (!el || el === document.body) return null
  const cs = getComputedStyle(el)
  const rect = el.getBoundingClientRect()
  const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0
  const shadow = cs.boxShadow !== 'none'
  const wrapper = el.closest('label, .composer-box, .field')
  const wcs = wrapper ? getComputedStyle(wrapper) : null
  const parentRing = !!wcs && (wcs.boxShadow !== 'none' || (wcs.outlineStyle !== 'none' && parseFloat(wcs.outlineWidth) > 0))
  const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.getAttribute('name') || '')
    .trim().replace(/\s+/g, ' ').slice(0, 50)
  window.__a11yIds ??= new WeakMap()
  if (!window.__a11yIds.has(el)) window.__a11yIds.set(el, window.__a11yIds.size + 1)
  const sel = el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '')
  return {
    id: window.__a11yIds.get(el), sel, name, visibleFocus: outline || shadow || parentRing,
    inViewport: rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth,
  }
}

async function walk(page) {
  const seen = []
  let wraps = 0
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press('Tab')
    const d = await page.evaluate(describeActive)
    if (!d) {
      // Fokus opuścił dokument (pasek przeglądarki); kolejny Tab wraca na początek strony
      if (++wraps === 2) return { seen }
      continue
    }
    if (seen.some((s) => s.id === d.id && s.round === wraps)) return { seen, trap: true }
    seen.push({ ...d, round: wraps })
  }
  return { seen, trap: true }
}

async function main() {
  const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] })
  let problems = 0
  for (const route of await routes()) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 800 }, locale: 'pl-PL', reducedMotion: 'reduce' })
      const page = await context.newPage()
      await page.goto(BASE_URL + route, { waitUntil: 'networkidle' })
      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {})
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      const { seen, trap } = await walk(page)
      const issues = []
      if (overflow > 1) issues.push(`poziomy scroll: +${overflow} px`)
      if (trap) issues.push(`pułapka fokusu albo > ${MAX_TABS} elementów`)
      for (const s of seen) {
        if (!s.visibleFocus) issues.push(`brak widocznego fokusu: ${s.sel} "${s.name}"`)
        if (!s.inViewport) issues.push(`fokus poza oknem: ${s.sel} "${s.name}"`)
      }
      // Esc nie może zostawić fokusu w nieistniejącym elemencie ani zamknąć strony
      await page.keyboard.press('Escape')
      problems += issues.length
      console.log(`\n${route} @ ${width}px: ${seen.length} elementów w kolejności Tab, problemów: ${issues.length}`)
      console.log('  ' + seen.map((s) => `${s.sel}${s.name ? ` "${s.name}"` : ''}`).join('\n  '))
      issues.forEach((i) => console.log(`  ! ${i}`))
      await context.close()
    }
  }
  await browser.close()
  process.exit(problems ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(2) })
