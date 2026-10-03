// Porządkuje tekst wyciągnięty z PDF (assets/*/text/*.md): skleja łamane wiersze w akapity, rozpoznaje
// nagłówki, wypunktowania, przypisy, wykaz skrótów i spis treści. Heurystyki dobrane do raportów ROPS,
// przy innym układzie tekst po prostu zostaje akapitami.

export type Block =
  | { t: 'h'; level: 2 | 3; id: string; text: string; page: number }
  | { t: 'p'; text: string; page: number }
  | { t: 'ul'; items: string[]; page: number }
  | { t: 'dl'; items: [string, string][]; page: number }
  | { t: 'note'; text: string; page: number }
  | { t: 'label'; text: string; page: number }
  | { t: 'page'; page: number; label?: string }

export interface Heading { id: string; text: string; level: 2 | 3; page: number }

export interface ParsedReport {
  /** Strona tytułowa, kolofon (przed spisem treści). */
  front: Block[]
  blocks: Block[]
  headings: Heading[]
  words: number
}

const UP = 'A-ZĄĆĘŁŃÓŚŹŻ'
const BULLET = /^[✓•●▪◦■➢]\s*/
const RUNNING_STRONA = /^(?:Strona\s*■\s*(\d+)|(\d+)\s*■\s*Strona)$/
const LEADER = /\.{4,}\s*\d+\s*$/

const isUpper = (s: string) => /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(s) && !/[a-ząćęłńóśźż]/.test(s)
const normKey = (s: string) => s.replace(/[^A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]/g, '').toUpperCase()
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)

interface RawPage { page: number; lines: string[] }

function splitPages(tresc: string): RawPage[] {
  const parts = tresc.split(/<!--\s*page\s+(\d+)\s*-->/)
  const pages: RawPage[] = []
  if (parts[0].trim()) pages.push({ page: 0, lines: parts[0].split('\n') })
  for (let i = 1; i < parts.length; i += 2) pages.push({ page: Number(parts[i]), lines: (parts[i + 1] ?? '').split('\n') })
  return pages
}

/**
 * Spis treści: albo strona z wieloma wierszami z kropkami i numerem strony (cała pomijana), albo „Spis treści”
 * w środku strony, po którym idą pary „tytuł, numer strony” (strona jest ucinana w tym miejscu).
 */
function readToc(pages: RawPage[]): { tocPages: Set<number>; titles: Set<string>; cut: Map<number, number> } {
  const tocPages = new Set<number>()
  const titles = new Set<string>()
  const cut = new Map<number, number>()
  for (const p of pages) {
    // spis treści jest na początku; kropki z numerami dalej to np. spis tabel i rysunków
    if (p.page > 8) continue
    if (p.lines.filter((l) => LEADER.test(l)).length >= 4) {
      tocPages.add(p.page)
      let acc = ''
      for (const l of p.lines) {
        const t = l.trim()
        if (!t || /^spis tre/i.test(t)) continue
        if (LEADER.test(t)) {
          titles.add(normKey(`${acc} ${t.replace(/\.{4,}.*$/, '')}`))
          acc = ''
        } else acc += ` ${t}`
      }
      continue
    }
    const si = p.lines.findIndex((l) => /^spis tre/i.test(l.trim()))
    const rest = si >= 0 ? p.lines.slice(si + 1).map((l) => l.trim()).filter(Boolean) : []
    if (si >= 0 && rest.filter((l) => /^\d{1,3}$/.test(l)).length >= 4) {
      cut.set(p.page, si)
      let acc = ''
      for (const l of rest) {
        if (/^\d{1,3}$/.test(l)) {
          if (acc) titles.add(normKey(acc))
          acc = ''
        } else acc += ` ${l}`
      }
    }
  }
  return { tocPages, titles, cut }
}

function glossary(lines: string[], page: number): Block {
  const items: [string, string][] = []
  const abbr = /^[A-ZĄĆĘŁŃÓŚŹŻ]{2,}[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9 -]{0,12}$/
  const report = /^\S+(?: \S+)?-\d{2}$/ // „Sprawozdanie MRiPS-03”
  const dashed = /^([A-ZĄĆĘŁŃÓŚŹŻ][A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9/]{1,9}) [–-] (.+)$/
  for (const raw of lines) {
    const t = raw.trim()
    if (!t || /^str\.\s*\d+$/i.test(t)) continue
    const dash = dashed.exec(t)
    const open = items.length > 0 && items[items.length - 1][1] === ''
    if (dash) items.push([dash[1], dash[2]])
    else if (((abbr.test(t) && t.length <= 16) || report.test(t)) && !open) items.push([t, ''])
    else if (items.length) items[items.length - 1][1] = `${items[items.length - 1][1]} ${t}`.trim()
  }
  return { t: 'dl', items: items.filter(([, d]) => d), page }
}

export function parseReport(tresc: string | null): ParsedReport {
  const empty: ParsedReport = { front: [], blocks: [], headings: [], words: 0 }
  if (!tresc) return empty
  const pages = splitPages(tresc)
  const { tocPages, titles, cut } = readToc(pages)
  const tocStarts = [...tocPages, ...cut.keys()]
  const firstToc = tocStarts.length ? Math.min(...tocStarts) : null
  const blocks: Block[] = []
  const front: Block[] = []
  const headings: Heading[] = []
  const used = new Set<string>()

  // Wiersze powtarzające się w całym dokumencie: nagłówki i stopki stron (pomijane) albo etykiety sekcji,
  // np. „Krótki opis innowacji” w publikacjach (osobny styl, bez wpisu w spisie treści)
  const stat = new Map<string, { n: number; edge: number }>()
  for (const pg of pages) {
    if (tocPages.has(pg.page)) continue
    const ls = pg.lines.map((l) => l.trim()).filter(Boolean)
    ls.forEach((t, i) => {
      if (t.length < 6 || t.length > 80 || /^\d+$/.test(t) || BULLET.test(t) || /[.,;]$/.test(t)) return
      const st = stat.get(t) ?? { n: 0, edge: 0 }
      st.n++
      if (i < 2 || i >= ls.length - 2) st.edge++
      stat.set(t, st)
    })
  }
  const dropLines = new Set<string>()
  const labelLines = new Set<string>()
  for (const [t, { n, edge }] of stat) {
    if (n >= 4 && edge / n >= 0.6) dropLines.add(t)
    else if (n >= 6 && t.split(/\s+/).length <= 7 && /^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(t)) labelLines.add(t)
  }
  const state = { czesc: '', rozdzial: '' }
  const emitHeading = (out: Block[], text: string, level: 2 | 3, page: number) => {
    let id = `h-${slug(text) || 'sekcja'}`
    while (used.has(id)) id += '-2'
    used.add(id)
    if (out === blocks) headings.push({ id, text, level, page })
    out.push({ t: 'h', level, id, text, page })
  }

  for (const pg of pages) {
    if (tocPages.has(pg.page)) continue
    if (cut.has(pg.page)) pg.lines = pg.lines.slice(0, cut.get(pg.page))
    const out = firstToc !== null && pg.page < firstToc ? front : blocks

    // Nagłówki robocze stron (np. „Strona ■ 7”, „■ Rozdział 1 …”): numery stron drukowanych i kontekst rozdziału
    const ctx = { czesc: '', rozdzial: '' }
    const printed: number[] = []
    pg.lines = pg.lines.map((l) => l.replace(/\t/g, ' ')).filter((l) => {
      const t = l.trim()
      let m: RegExpExecArray | null
      if ((m = RUNNING_STRONA.exec(t))) { printed.push(Number(m[1] ?? m[2])); return false }
      if ((m = /^■\s*(Rozdział\s+\d+.*)$/.exec(t))) { ctx.rozdzial = m[1].trim(); return false }
      if ((m = /^■\s*((?:Część|CZĘŚĆ)\s+[IVX]+.*)$/.exec(t))) { ctx.czesc = m[1].trim(); return false }
      return t !== '■'
    })
    if (ctx.rozdzial) {
      // duży tytuł rozdziału ze składu: „Rozdział 1” oraz tytuł łamany na kilka wierszy
      const key = normKey(ctx.rozdzial.replace(/^Rozdział\s+\d+\s*/, ''))
      pg.lines = pg.lines.filter((l) => !/^Rozdział\s+\d+\s*$/.test(l.trim()))
      outer: for (let end = pg.lines.length; end > 0; end--) {
        for (let k = 1; k <= 6 && end - k >= 0; k++) {
          const frag = pg.lines.slice(end - k, end)
          if (normKey(frag.join(' ')) === key) { pg.lines.splice(end - k, k); break outer }
        }
      }
    }
    if (ctx.czesc) pg.lines = pg.lines.filter((l) => normKey(l) !== normKey(ctx.czesc))
    const label = printed.length >= 2 ? `strony ${Math.min(...printed)}–${Math.max(...printed)}` : printed.length === 1 ? `strona ${printed[0]}` : undefined

    const nonEmpty = pg.lines.map((l, i) => (l.trim() ? i : -1)).filter((i) => i >= 0)
    const firstIdx = nonEmpty[0] ?? -1
    const lastIdx = nonEmpty[nonEmpty.length - 1] ?? -1
    const lens = pg.lines.map((l) => l.trim().length)
    // długość „pełnego” wiersza: percentyl, żeby pojedynczy bardzo długi wiersz nie zaniżał progu końca akapitu
    const sortedLens = lens.filter(Boolean).sort((a, b) => a - b)
    const maxLen = Math.max(sortedLens[Math.floor(sortedLens.length * 0.85)] ?? 1, 1)
    const pageStart = out.length
    out.push({ t: 'page', page: pg.page, label })
    if (ctx.czesc && ctx.czesc !== state.czesc) { emitHeading(out, ctx.czesc, 2, pg.page); state.czesc = ctx.czesc }
    if (ctx.rozdzial && ctx.rozdzial !== state.rozdzial) { emitHeading(out, ctx.rozdzial, 3, pg.page); state.rozdzial = ctx.rozdzial }

    // wykaz skrótów: osobna obsługa (pary skrót + objaśnienie w kolejnych wierszach)
    const gi = pg.lines.findIndex((l) => /^WYKAZ (UŻYWANYCH )?SKRÓTÓW/i.test(l.trim()))
    if (gi >= 0) {
      const id = `h-${slug('wykaz skrotow')}`
      headings.push({ id, text: 'Wykaz używanych skrótów', level: 2, page: pg.page })
      out.push({ t: 'h', level: 2, id, text: 'Wykaz używanych skrótów', page: pg.page })
      out.push(glossary(pg.lines.slice(gi + 1), pg.page))
      continue
    }

    let para = ''
    let bullets: string[] | null = null
    let note: string | null = null
    let prevEnd = true // poprzedni wiersz kończył akapit
    const flush = () => {
      if (para.trim()) out.push({ t: 'p', text: para.trim(), page: pg.page })
      para = ''
    }
    const flushBullets = () => {
      if (bullets?.length) out.push({ t: 'ul', items: bullets, page: pg.page })
      bullets = null
    }
    const flushNote = () => {
      if (note) out.push({ t: 'note', text: note.trim(), page: pg.page })
      note = null
    }
    let headBuf: string | null = null
    const flushHead = () => {
      if (headBuf === null) return
      const text = headBuf.replace(/\s+/g, ' ').trim().replace(new RegExp(`(?<=[${UP}])\\d{1,2}$`), '')
      headBuf = null
      if (!text) return
      const level: 2 | 3 = !titles.size || titles.has(normKey(text)) ? 2 : 3
      emitHeading(out, text, level, pg.page)
    }

    for (let i = 0; i < pg.lines.length; i++) {
      const raw = pg.lines[i]
      const t = raw.trim()
      if (!t) { flushHead(); flush(); flushBullets(); prevEnd = true; continue }
      if (/^str\.\s*\d+$/i.test(t) || t === String(pg.page)) continue
      // numer strony drukowanej na początku lub końcu strony
      if (/^\d{1,3}$/.test(t) && (i === firstIdx || i === lastIdx)) continue
      if (dropLines.has(t)) continue
      if (note === null && labelLines.has(t)) {
        flushHead(); flush(); flushBullets()
        out.push({ t: 'label', text: t, page: pg.page })
        prevEnd = true
        continue
      }
      // numerowany tytuł krótkiej sekcji („2. Strażnik”): tylko gdy jest w spisie treści albo dokument nie ma spisu
      const numHead = /^\d{1,2}\.\s+\S/.exec(t)
      if (numHead && prevEnd && note === null && t.length <= 70 && !/[.,;:]$/.test(t.replace(/^\d{1,2}\./, '')) && (titles.size === 0 || titles.has(normKey(t)))) {
        flushHead(); flush(); flushBullets()
        headBuf = t
        flushHead()
        prevEnd = true
        continue
      }

      // przypis na dole strony: „2  W rozdziale…”
      const startsNote = /^\d{1,2}\.?\s{2,}\S/.test(raw) && i >= firstIdx + (lastIdx - firstIdx) * 0.5 // przypisy są na dole strony, nie w ramkach w środku
      if (startsNote || (note !== null && !BULLET.test(t))) {
        if (note === null || startsNote) {
          flushHead(); flush(); flushBullets(); flushNote()
          note = t.replace(/^\d{1,2}\.?\s+/, '')
        } else note += ` ${t}`
        continue
      }

      // dalszy ciąg nagłówka łamanego na kilka wierszy: poprzedni kończy się przecinkiem albo sięga prawie do marginesu,
      // a nie kończy się znacznikiem przypisu (wtedy następny wiersz to już nowy nagłówek)
      const prevHead = headBuf === null ? '' : headBuf.trimEnd()
      const wrapped = prevHead.endsWith(',') || (prevHead.length >= maxLen * 0.6 && !new RegExp(`[${UP}]\\d{1,2}$`).test(prevHead))
      const joined = normKey(`${prevHead} ${t}`)
      const inToc = headBuf !== null && [...titles].some((x) => x.startsWith(joined))
      const longHead = headBuf !== null && (wrapped || inToc) && isUpper(t) && t.length > 3
      if ((isUpper(t) && t.replace(/[^A-ZĄĆĘŁŃÓŚŹŻ]/g, '').length >= 5 && t.length <= 150 && prevEnd && !/[.]$/.test(t)) || longHead) {
        if (headBuf === null) { flush(); flushBullets() }
        headBuf = headBuf === null ? t : `${headBuf} ${t}`
        prevEnd = false
        continue
      }
      flushHead()

      const endsPara = /[.!?:;»”)]\s{2,}$/.test(raw)
      if (BULLET.test(t)) {
        flush()
        bullets = bullets ?? []
        bullets.push(t.replace(BULLET, ''))
        prevEnd = endsPara
        continue
      }
      const startsNew = prevEnd || (/^[A-ZĄĆĘŁŃÓŚŹŻ„"(\d]/.test(t) && lensPrev(pg.lines, i, maxLen))
      if (bullets && !startsNew) {
        bullets[bullets.length - 1] += ` ${t}`
      } else if (bullets && startsNew) {
        flushBullets()
        para = t
      } else if (startsNew) {
        flush()
        para = t
      } else {
        para += ` ${t}`
      }
      prevEnd = endsPara
    }
    flushHead(); flush(); flushBullets(); flushNote()
    // strona bez treści: bez znacznika
    if (out.length === pageStart + 1) out.pop()
  }

  // zdanie urwane na końcu strony: sklej z początkiem następnej (akapit od małej litery)
  const merged: Block[] = []
  for (const b of blocks) {
    const prev = merged[merged.length - 1]
    const beforePage = merged[merged.length - 2]
    if (b.t === 'p' && prev?.t === 'page' && beforePage?.t === 'p' && !/[.!?:;»”)]$/.test(beforePage.text) && /^[a-ząćęłńóśźż]/.test(b.text)) {
      beforePage.text += ` ${b.text}`
      continue
    }
    merged.push(b)
  }

  const textOf = (bs: Block[]) => bs.map((b) => (b.t === 'p' || b.t === 'note' || b.t === 'h' ? b.text : b.t === 'ul' ? b.items.join(' ') : b.t === 'dl' ? b.items.flat().join(' ') : '')).join(' ')
  const words = textOf(merged).split(/\s+/).filter(Boolean).length
  return { front, blocks: merged, headings, words }
}

/** Czy poprzedni wiersz był „krótki” (koniec akapitu w tekście łamanym co ok. 100 znaków). */
function lensPrev(lines: string[], i: number, maxLen: number): boolean {
  for (let j = i - 1; j >= 0; j--) {
    const p = lines[j].trim()
    if (!p) continue
    return /[.!?:;»”)]$/.test(p) && p.length < maxLen * 0.7
  }
  return true
}

export const readingMinutes = (words: number) => Math.max(1, Math.round(words / 200))
