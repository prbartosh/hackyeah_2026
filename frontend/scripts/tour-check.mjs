#!/usr/bin/env node
// Przejście całego przewodnika w przeglądarce (Playwright): każdy krok, w szerokościach 1280 i 360 px.
// Raportuje kroki, w których element nie został znaleziony, chmurka wyszła poza ekran albo akcja się nie udała.
//
//   npm run tour:check                                   # BASE_URL=http://localhost:8080
//   BASE_URL=http://localhost:5199 TOUR_ACTIONS=1 ADMIN_TOKEN=... npm run tour:check
//
// Zmienne: BASE_URL, TOUR_ACTIONS=1 (klika też „Zrób to za mnie”), ADMIN_TOKEN (wstrzykuje sessionStorage['admin-token']),
// TOUR_WIDTHS (domyślnie 1280,360), TOUR_START (domyślnie "przewodnik=1"; w dev "przewodnik=demo"),
// TOUR_AXE=1 (axe-core przy otwartej chmurce, każdy krok), TOUR_SHOTS (katalog zrzutów każdego kroku, opcjonalnie),
// TOUR_STEP_TIMEOUT (ms oczekiwania na gotowość kroku, domyślnie 110000).
// Kod wyjścia: 0 = brak problemów, 1 = są problemy, 2 = błąd skryptu.
// Chromium: PLAYWRIGHT_BROWSERS_PATH albo A11Y_CHROMIUM (ścieżka do pliku wykonywalnego), jak w a11y-audit.mjs.
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'

const BASE_URL = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '')
const ACTIONS = process.env.TOUR_ACTIONS === '1'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''
const WIDTHS = (process.env.TOUR_WIDTHS || '1280,360').split(',').map(Number)
const START = process.env.TOUR_START || 'przewodnik=1'
const AXE = process.env.TOUR_AXE === '1'
const SHOTS = process.env.TOUR_SHOTS || ''
const STEP_TIMEOUT = Number(process.env.TOUR_STEP_TIMEOUT || 110000)
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

function findChromium() {
  if (process.env.A11Y_CHROMIUM) return process.env.A11Y_CHROMIUM
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (!root || !existsSync(root)) return undefined
  const dirs = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()
  for (const d of dirs) {
    for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const p = path.join(root, d, rel)
      if (existsSync(p)) return p
    }
  }
  return undefined
}

const state = (page) => page.evaluate(() => window.__splotTour?.state ?? null)

async function waitSettled(page) {
  const deadline = Date.now() + STEP_TIMEOUT
  while (Date.now() < deadline) {
    const s = await state(page)
    if (!s || s.screen !== 'step') return s
    if (['ready', 'missing', 'error', 'login'].includes(s.phase)) return s
    await page.waitForTimeout(150)
  }
  return { ...(await state(page)), phase: 'timeout' }
}

async function walk(browser, width) {
  const issues = []
  const steps = []
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 740 : 900 }, locale: 'pl-PL', reducedMotion: 'reduce' })
  if (ADMIN_TOKEN) await context.addInitScript((t) => { try { sessionStorage.setItem('admin-token', t) } catch { /* noop */ } }, ADMIN_TOKEN)
  const page = await context.newPage()
  page.on('pageerror', (e) => issues.push({ step: '(strona)', problem: `błąd JS: ${e.message}` }))
  try {
    await page.goto(`${BASE_URL}/?${START}`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.getByRole('button', { name: 'Zacznij od początku' }).click({ timeout: 10000 })
    if (SHOTS) mkdirSync(SHOTS, { recursive: true })

    for (let guard = 0; guard < 600; guard++) {
      const s = await waitSettled(page)
      if (!s || s.screen === 'closed') break
      if (s.screen === 'summary') break
      if (s.screen === 'chapterDone') {
        await page.getByRole('button', { name: /Następny rozdział/ }).click()
        continue
      }
      const id = s.stepId
      const rec = { step: id, phase: s.phase }
      steps.push(rec)
      if (s.phase === 'missing') issues.push({ step: id, problem: 'nie znaleziono elementu (chmurka na środku, „Pomiń krok”)' })
      if (s.phase === 'error') issues.push({ step: id, problem: `błąd: ${await page.locator('.tour-notice--error').first().textContent().catch(() => '?')}` })
      if (s.phase === 'timeout') issues.push({ step: id, problem: 'krok nie stał się gotowy w czasie' })
      if (s.phase === 'login') issues.push({ step: id, problem: 'wymaga logowania w panelu (ustaw ADMIN_TOKEN)' })

      const bubble = page.locator('.tour-bubble')
      const box = await bubble.boundingBox().catch(() => null)
      if (box) {
        const vp = page.viewportSize()
        if (box.x < -1 || box.y < -1 || box.x + box.width > vp.width + 1 || box.y + box.height > vp.height + 1) {
          issues.push({ step: id, problem: `chmurka poza ekranem (${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)})` })
        }
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      if (overflow > 1) issues.push({ step: id, problem: `poziomy scroll (+${overflow} px)` })
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${width}-${String(steps.length).padStart(3, '0')}-${id}.png`) })
      if (AXE) {
        const res = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        for (const v of res.violations) issues.push({ step: id, problem: `axe ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 2).join(' | ')}` })
      }

      if (ACTIONS) {
        const act = page.getByRole('button', { name: /Zrób to za mnie|Robię/ })
        if (await act.count()) {
          await act.first().click()
          await page.waitForFunction(() => !document.querySelector('.tour-foot [aria-busy="true"]'), null, { timeout: 120000 }).catch(() => {})
          await page.waitForTimeout(300)
          const err = await page.locator('.tour-notice--error').first().textContent({ timeout: 500 }).catch(() => null)
          if (err) issues.push({ step: id, problem: `akcja: ${err}` })
          rec.acted = true
        }
      }

      const now = await state(page)
      if (now?.stepId !== id || now?.screen !== 'step') continue // krok przeszedł sam (advanceOn)
      await page.locator('.tour-btn--next').click()
      await page.waitForTimeout(150)
    }
  } catch (e) {
    issues.push({ step: '(skrypt)', problem: String(e.message || e).split('\n')[0] })
  } finally {
    await context.close()
  }
  return { width, steps, issues }
}

async function main() {
  const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] })
  let total = 0
  let broken = false
  for (const width of WIDTHS) {
    const r = await walk(browser, width)
    console.log(`\n== ${width} px: kroków ${r.steps.length}${ACTIONS ? ' (z akcjami)' : ''}, problemów ${r.issues.length}`)
    for (const i of r.issues) console.log(`  - ${i.step}: ${i.problem}`)
    total += r.issues.length
    if (r.steps.length === 0) broken = true
  }
  await browser.close()
  if (broken) console.log('\nBrak kroków do przejścia (rozdziały puste albo przewodnik się nie uruchomił).')
  process.exit(broken ? 2 : total ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(2) })
