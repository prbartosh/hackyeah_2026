// Porządkuje tekst wyciągnięty z PDF (assets/*/text/*.md): skleja łamane wiersze w akapity, rozpoznaje
// nagłówki, wypunktowania, przypisy, wykaz skrótów i spis treści. Heurystyki dobrane do raportów ROPS,
// przy innym układzie tekst po prostu zostaje akapitami.

export type Block =
  | { t: 'h'; level: 2 | 3; id: string; text: string; page: number }
  | { t: 'p'; text: string; page: number }
  | { t: 'ul'; items: string[]; page: number }
  | { t: 'dl'; items: [string, string][]; page: number }
  | { t: 'note'; text: string; page: number }
  | { t: 'page'; page: number }

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

/** Spis treści: strona z wieloma wierszami z kropkami i numerem strony. Zwraca klucze tytułów. */
function readToc(pages: RawPage[]): { tocPages: Set<number>; titles: Set<string> } {
  const tocPages = new Set<number>()
  const titles = new Set<string>()
  for (const p of pages) {
    // spis treści jest na początku; kropki z numerami dalej to np. spis tabel i rysunków
    if (p.page > 8 || p.lines.filter((l) => LEADER.test(l)).length < 4) continue
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
  }
  return { tocPages, titles }
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
  const { tocPages, titles } = readToc(pages)
  const firstToc = tocPages.size ? Math.min(...tocPages) : null
  const blocks: Block[] = []
  const front: Block[] = []
  const headings: Heading[] = []
  const used = new Set<string>()

  for (const pg of pages) {
    if (tocPages.has(pg.page)) continue
    const out = firstToc !== null && pg.page < firstToc ? front : blocks
    const lens = pg.lines.map((l) => l.trim().length)
    const maxLen = Math.max(...lens, 1)
    const pageStart = out.length
    out.push({ t: 'page', page: pg.page })

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
      let id = `h-${slug(text) || 'sekcja'}`
      while (used.has(id)) id += '-2'
      used.add(id)
      const level: 2 | 3 = !titles.size || titles.has(normKey(text)) ? 2 : 3
      if (out === blocks) headings.push({ id, text, level, page: pg.page })
      out.push({ t: 'h', level, id, text, page: pg.page })
    }

    for (let i = 0; i < pg.lines.length; i++) {
      const raw = pg.lines[i]
      const t = raw.trim()
      if (!t) { flushHead(); flush(); flushBullets(); prevEnd = true; continue }
      if (/^str\.\s*\d+$/i.test(t) || t === String(pg.page)) continue

      // przypis na dole strony: „2  W rozdziale…”
      if (/^\d{1,2}\s{2,}\S/.test(raw) || (note !== null && !BULLET.test(t))) {
        if (note === null || /^\d{1,2}\s{2,}\S/.test(raw)) {
          flushHead(); flush(); flushBullets(); flushNote()
          note = t.replace(/^\d{1,2}\s+/, '')
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
      if ((isUpper(t) && t.replace(/[^A-ZĄĆĘŁŃÓŚŹŻ]/g, '').length >= 5 && t.length <= 150 && prevEnd) || longHead) {
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
