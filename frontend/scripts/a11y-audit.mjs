#!/usr/bin/env node
// Audyt dostępności axe-core (Playwright) na wszystkich trasach, w 3 motywach i 2 szerokościach.
//
//   npm run a11y                                  # BASE_URL=http://localhost:8080
//   BASE_URL=http://localhost:5199 ADMIN_TOKEN=... npm run a11y
//
// Zmienne: BASE_URL, ADMIN_TOKEN (panel /admin/*), A11Y_WIDTHS (domyślnie 1280,320),
// A11Y_THEMES (standard,dark,high-contrast), A11Y_ROUTES (podciąg ścieżki, np. "wspolpraca,watek"),
// A11Y_SEED=0 (bez zakładania danych testowych przez API), A11Y_OUT (katalog wyniku).
// Kod wyjścia: 0 = brak naruszeń, 1 = są naruszenia, 2 = błąd audytu (np. trasa się nie załadowała).
// Chromium: PLAYWRIGHT_BROWSERS_PATH albo A11Y_CHROMIUM (ścieżka do pliku wykonywalnego).
import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright-core'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const BASE_URL = (process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '')
const API = `${BASE_URL}/api/v1`
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''
const WIDTHS = (process.env.A11Y_WIDTHS || '1280,320').split(',').map(Number)
const THEMES = (process.env.A11Y_THEMES || 'standard,dark,high-contrast').split(',')
const FILTER = (process.env.A11Y_ROUTES || '').split(',').filter(Boolean)
const SEED = process.env.A11Y_SEED !== '0'
const OUT = process.env.A11Y_OUT || path.resolve('a11y-report')
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
const MARK = '[a11y] dane testowe audytu, do usunięcia'

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

async function call(method, url, body, admin = false) {
  const headers = { 'Content-Type': 'application/json' }
  if (admin) headers.Authorization = `Bearer ${ADMIN_TOKEN}`
  const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!r.ok) throw new Error(`${method} ${url} -> ${r.status} ${(await r.text()).slice(0, 200)}`)
  return r.json()
}

/** Prawdziwe slugi i tokeny: z API, a gdy ich brak, zakładamy dane testowe (A11Y_SEED=0 wyłącza). */
async function resolveParams() {
  const p = {}
  const warn = []
  const attempt = async (key, fn) => {
    try { p[key] = await fn() } catch (e) { warn.push(`${key}: ${e.message}`) }
  }
  await attempt('slug', async () => (await call('GET', `${API}/innovations`))[0].slug)
  await attempt('docId', async () => (await call('GET', `${API}/documents`))[0].id)
  if (SEED) {
    await attempt('threadToken', async () =>
      (await call('POST', `${API}/zgloszenia`, {
        tresc: `${MARK}. Chcemy uruchomić w gminie wsparcie sąsiedzkie dla seniorów.`,
        autor_nazwa: 'Audyt a11y',
      })).token_watku)
    await attempt('fiszkaToken', async () => {
      const [kategoria] = await call('GET', `${API}/categories`)
      return (await call('POST', `${API}/kreator/fiszki`, { istota: MARK, obszar: kategoria.slug })).token
    })
    await attempt('canvaToken', async () => {
      const szablony = await call('GET', `${API}/kreator/canvy/szablony`)
      const s = szablony[0]
      return (await call('POST', `${API}/kreator/canvy`, { szablon: s.slug ?? s.klucz ?? s.id, tytul: MARK })).token
    })
    await attempt('conversationToken', async () => {
      let offer = (await call('GET', `${API}/partnerstwa`))[0]
      if (!offer) {
        if (!ADMIN_TOKEN) throw new Error('brak ogłoszeń, a zatwierdzenie nowego wymaga ADMIN_TOKEN')
        offer = await call('POST', `${API}/partnerstwa`, {
          typ: 'szukam_partnera', sektor: 'ngo', instytucja: 'Audyt a11y', tytul: MARK,
          opis: 'Szukamy partnera do wspólnego projektu dla seniorów w gminie.',
          powiat: 'm. Kraków', kontakt_email: 'a11y@example.com',
        })
        await call('PATCH', `${API}/admin/partnerstwa/${offer.id}`, { status: 'opublikowane' }, true)
      }
      return (await call('POST', `${API}/partnerstwa/${offer.id}/kontakt`, {
        nadawca_nazwa: 'Audyt a11y', nadawca_email: 'a11y2@example.com',
        tresc: 'Dzień dobry, chcemy porozmawiać o współpracy.',
      })).token_rozmowy
    })
    await attempt('naborSlug', async () => {
      if (!ADMIN_TOKEN) throw new Error('wymaga ADMIN_TOKEN')
      const list = await call('GET', `${API}/admin/nabory`, null, true)
      const found = list.items.find((n) => n.nazwa.startsWith('[a11y]'))
      if (found) return found.slug
      const year = new Date().getFullYear() + 1
      return (await call('POST', `${API}/admin/nabory`, {
        nazwa: '[a11y] Nabór testowy', organizator: 'Audyt', opis: MARK,
        termin_od: `${year}-01-01`, termin_do: `${year}-12-31`,
        pola: [{ klucz: 'opis', etykieta: 'Opis projektu', limit: 2000, wskazowka: '', zrodla: [] }],
      }, true)).slug
    })
    await attempt('wniosekToken', async () => {
      if (!p.fiszkaToken || !p.naborSlug) throw new Error('brak fiszki albo naboru')
      return (await call('POST', `${API}/kreator/wnioski`, { fiszka_token: p.fiszkaToken, nabor_slug: p.naborSlug })).token
    })
  }
  if (ADMIN_TOKEN) {
    await attempt('ticketId', async () => (await call('GET', `${API}/admin/zgloszenia`, null, true)).items[0].id)
    await attempt('cardSlug', async () => (await call('GET', `${API}/admin/karty`, null, true)).items[0].slug)
    await attempt('importId', async () => (await call('GET', `${API}/admin/importy`, null, true)).items[0].id)
    if (!p.naborSlug) {
      await attempt('naborSlug', async () => (await call('GET', `${API}/admin/nabory`, null, true)).items[0].slug)
    }
  }
  return { p, warn }
}

/** Brak parametru z API: atrapa (`brak-<nazwa>`), czyli stan błędu strony; trasa oznaczona `~`. */
function routeList(p) {
  const list = []
  const add = (tpl, admin = false) => {
    let placeholder = false
    const route = tpl.replace(/\{(\w+)\}/g, (_, k) => {
      if (p[k] === undefined) placeholder = true
      return encodeURIComponent(String(p[k] ?? `brak-${k}`))
    })
    list.push({ path: route, admin, placeholder })
  }
  for (const r of [
    '/', '/zasobnik', '/innowacja/{slug}', '/innowacja/{slug}/wdrozenie', '/porownaj',
    '/dokument/{docId}', '/otwarte-dane', '/zglos', '/wspolpraca', '/partnerstwa', '/mentorzy',
    '/pytania', '/watek/{threadToken}', '/rozmowa/{conversationToken}',
    '/mentor/brak-mentora/{threadToken}', '/dostepnosc', '/kreator', '/kreator/fiszka',
    '/kreator/fiszka/{fiszkaToken}', '/kreator/finansowanie', '/kreator/wniosek/{wniosekToken}',
    '/kreator/canva', '/kreator/canva/{canvaToken}', '/nie-ma-takiej-strony',
  ]) add(r)
  for (const r of [
    '/admin', '/admin/zgloszenia/{ticketId}', '/admin/powiadomienia', '/admin/importy',
    '/admin/importy/{importId}', '/admin/karty', '/admin/karty/{cardSlug}', '/admin/radar',
    '/admin/nabory', '/admin/nabory/{naborSlug}', '/admin/opinie', '/admin/partnerstwa',
    '/admin/mentorzy', '/admin/pytania',
  ]) add(r, true)
  return FILTER.length ? list.filter((r) => FILTER.some((f) => r.path.includes(f))) : list
}

async function auditPage(browser, route, theme, width) {
  const context = await browser.newContext({
    viewport: { width, height: width < 600 ? 800 : 900 }, locale: 'pl-PL', reducedMotion: 'reduce',
  })
  await context.addInitScript(({ theme, token }) => {
    try { localStorage.setItem('hubmi-theme', theme) } catch { /* noop */ }
    try { if (token) sessionStorage.setItem('admin-token', token) } catch { /* noop */ }
  }, { theme, token: ADMIN_TOKEN })
  const page = await context.newPage()
  try {
    await page.goto(BASE_URL + route.path, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(300)
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
    const violations = results.violations.map((v) => ({
      id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl,
      nodes: v.nodes.map((n) => ({
        target: n.target.join(' '), summary: n.failureSummary?.split('\n').slice(1).join(' '),
      })),
    }))
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (overflow > 1) {
      violations.push({
        id: 'poziomy-scroll', impact: 'serious', help: `Strona szersza od okna o ${overflow} px`,
        nodes: [{ target: 'html', summary: '' }],
      })
    }
    return { ...route, theme, width, violations }
  } catch (e) {
    return { ...route, theme, width, error: String(e.message || e), violations: [] }
  } finally {
    await context.close()
  }
}

async function main() {
  if (!ADMIN_TOKEN) console.warn('UWAGA: brak ADMIN_TOKEN, trasy /admin/* nie zostaną zbadane.')
  const { p, warn } = await resolveParams()
  warn.forEach((w) => console.warn(`  parametr trasy: ${w}`))
  let routes = routeList(p)
  if (!ADMIN_TOKEN) routes = routes.filter((r) => !r.admin)

  const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] })
  const combos = THEMES.flatMap((theme) => WIDTHS.map((width) => ({ theme, width })))
  const results = []
  const queue = routes.flatMap((r) => combos.map((c) => ({ r, ...c })))
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      results.push(await auditPage(browser, job.r, job.theme, job.width))
    }
  }))
  await browser.close()

  const count = (r) => r.violations.length
  const header = ['trasa', ...combos.map((c) => `${c.theme.slice(0, 4)} ${c.width}`)]
  const rows = routes.map((r) => [
    r.path + (r.placeholder ? ' ~' : ''),
    ...combos.map((c) => {
      const res = results.find((x) => x.path === r.path && x.theme === c.theme && x.width === c.width)
      return res.error ? 'BŁĄD' : String(count(res))
    }),
  ])
  const w = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
  const line = (cells) => cells.map((c, i) => (i ? c.padStart(w[i]) : c.padEnd(w[i]))).join('  ')
  console.log('\nNaruszenia axe (liczba reguł) na trasę, motyw i szerokość; ~ = atrapa parametru (stan błędu)\n')
  console.log(line(header))
  console.log(w.map((n) => '-'.repeat(n)).join('  '))
  rows.forEach((r) => console.log(line(r)))

  const seen = new Map()
  for (const r of results) for (const v of r.violations) for (const n of v.nodes) {
    const k = `${v.id} | ${n.target}`
    if (!seen.has(k)) seen.set(k, { v, n, where: new Set() })
    seen.get(k).where.add(`${r.path} (${r.theme}, ${r.width})`)
  }
  if (seen.size) console.log('\nSzczegóły (reguła | element):')
  for (const [k, { v, n, where }] of seen) {
    const list = [...where]
    console.log(`- [${v.impact}] ${k}: ${v.help}`)
    console.log(`    ${list.slice(0, 3).join('; ')}${list.length > 3 ? ` (+${list.length - 3})` : ''}`)
    if (n.summary) console.log(`    ${n.summary.slice(0, 220)}`)
  }
  const errors = results.filter((r) => r.error)
  errors.forEach((r) => console.log(`BŁĄD ${r.path} (${r.theme}, ${r.width}): ${r.error}`))

  mkdirSync(OUT, { recursive: true })
  const file = path.join(OUT, 'axe.json')
  results.sort((a, b) => a.path.localeCompare(b.path) || a.theme.localeCompare(b.theme) || b.width - a.width)
  writeFileSync(file, JSON.stringify({
    baseUrl: BASE_URL, date: new Date().toISOString(), tags: TAGS, widths: WIDTHS, themes: THEMES,
    params: p, results,
  }, null, 2))
  const total = results.reduce((s, r) => s + count(r), 0)
  console.log(`\nStron: ${results.length}, naruszeń: ${total}, błędów ładowania: ${errors.length}. Raport: ${file}`)
  process.exit(total ? 1 : errors.length ? 2 : 0)
}

main().catch((e) => { console.error(e); process.exit(2) })
