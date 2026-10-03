// Mapa Wyzwań Społecznych (assets/mapa-wyzwan) ma stały układ: 8 obszarów, a w każdym kolejno
// definicja, analiza danych, kluczowe wyzwania, persona (cele, wyzwania, motywacje) i polecane raporty.
// Parser czyta ten układ z tekstu wyciągniętego z PDF. Gdy układ się nie zgadza, zwraca null
// i strona pokazuje zwykły czytnik dokumentu.

export interface Sekcja {
  tytul: string | null
  akapity: string[]
  punkty: string[]
  zrodla: string[]
}

export interface Persona {
  imie: string
  opis: string[]
  cele: string[]
  wyzwania: string[]
  motywacje: string[]
}

export interface Obszar {
  nr: number
  nazwa: string
  definicja: Sekcja
  analiza: Sekcja[]
  wyzwania: Sekcja & { numerowane: boolean }
  persony: Persona[]
  raporty: string[]
}

export interface KluczowaLiczba { wartosc: string; opis: string }

const BULLET = /^[•●▪]\s*/
const NUMBERED = /^(\d{1,2})\.\s*(\S.*)$/
const SENTENCE_END = /[.!?:;)”"]$/

/**
 * Na slajdach persony trzy kolumny (cele, wyzwania, motywacje) wychodzą z PDF jako jedna lista, a nagłówki
 * kolumn stoją na końcu strony. Podział na kolumny to ręczna korekta według układu slajdów: [cele, wyzwania, motywacje].
 */
const PERSONA_PODZIAL: Record<string, [number, number, number]> = {
  Tomek: [3, 3, 2],
  Swietłana: [3, 3, 1],
  Stanisław: [3, 2, 3],
  Mateusz: [3, 3, 3],
  Karina: [3, 4, 3],
  Janina: [3, 3, 3],
}

const emptySekcja = (tytul: string | null = null): Sekcja => ({ tytul, akapity: [], punkty: [], zrodla: [] })

/** Samotny punktor „•” albo numer „1.” w osobnym wierszu łączymy z następnym wierszem. */
function mergeLone(lines: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i]
    if ((/^[•●▪]$/.test(t) || /^\d{1,2}\.$/.test(t)) && i + 1 < lines.length) {
      out.push(`${t} ${lines[i + 1]}`)
      i++
    } else out.push(t)
  }
  return out
}

/** Pozycje wypunktowane z wierszami ciągłymi doklejonymi do poprzedniej pozycji. */
function bulletItems(lines: string[]): string[] {
  const items: string[] = []
  for (const t of lines) {
    if (BULLET.test(t) || items.length === 0) items.push(t.replace(BULLET, ''))
    else items[items.length - 1] += ` ${t}`
  }
  return items
}

function parsePersona(lines: string[], idx: number): Persona {
  const after = lines.slice(idx + 1).filter((l) => !/^(Cele i potrzeby|Wyzwania|Motywacje)$/.test(l))
  const p: Persona = { imie: after[0] ?? '', opis: bulletItems(after.slice(1)), cele: [], wyzwania: [], motywacje: [] }
  const before = lines.slice(0, idx)
  const labelsFirst = before.some((l) => /^Cele i potrzeby$/.test(l))
  if (labelsFirst) {
    const groups: Record<string, string[]> = { 'Cele i potrzeby': [], Wyzwania: [], Motywacje: [] }
    let cur: string[] | null = null
    for (const l of before) {
      if (l in groups) cur = groups[l]
      else cur?.push(l)
    }
    p.cele = bulletItems(groups['Cele i potrzeby'])
    p.wyzwania = bulletItems(groups.Wyzwania)
    p.motywacje = bulletItems(groups.Motywacje)
  } else {
    const items = bulletItems(before)
    const split = PERSONA_PODZIAL[p.imie]
    if (split && split[0] + split[1] + split[2] === items.length) {
      p.cele = items.slice(0, split[0])
      p.wyzwania = items.slice(split[0], split[0] + split[1])
      p.motywacje = items.slice(split[0] + split[1])
    } else p.cele = items
  }
  return p
}

export function parseMapaWyzwan(tresc: string | null): Obszar[] | null {
  if (!tresc) return null
  const pages = tresc.split(/<!--\s*page\s+\d+\s*-->/).slice(1)
  if (pages.length < 10) return null

  // Spis obszarów ze strony „Zakres tematyczny”
  const names = new Map<number, string>()
  const scope = pages.find((p) => /Zakres tematyczny/i.test(p))
  for (const l of (scope ?? '').split('\n')) {
    const m = NUMBERED.exec(l.trim())
    if (m) names.set(Number(m[1]), m[2].trim())
  }
  if (names.size < 4) return null
  // Nazwa obszaru w stopce strony; po niej rozpoznajemy, do którego obszaru należy strona
  const areaNr = (t: string): number => {
    const m = NUMBERED.exec(t)
    return m && names.get(Number(m[1])) === m[2].trim() ? Number(m[1]) : 0
  }

  const areas = new Map<number, Obszar>()
  for (const [nr, nazwa] of names) {
    areas.set(nr, { nr, nazwa, definicja: emptySekcja(), analiza: [], wyzwania: { ...emptySekcja(), numerowane: false }, persony: [], raporty: [] })
  }

  let area = null as Obszar | null
  let sect: Sekcja | null = null
  let inSources = false
  let list: string[] | null = null // dalszy ciąg: raporty albo źródła
  let inBullets = false
  let para = ''
  let prevLen = 0

  const flushPara = () => {
    if (para.trim() && sect) sect.akapity.push(para.trim())
    para = ''
  }

  for (const page of pages) {
    const raw = page.split('\n').map((l) => l.trim()).filter(Boolean)
    const nr = raw.map(areaNr).find(Boolean)
    if (!nr) continue // strona tytułowa, spis obszarów
    if (area?.nr !== nr) {
      flushPara()
      area = areas.get(nr)!
      sect = null
      inSources = false
      list = null
      inBullets = false
    }
    const lines = mergeLone(raw.filter((l) => !areaNr(l)))

    // strona persony: cała osobno
    const pIdx = lines.indexOf('PERSONA')
    if (pIdx >= 0) {
      flushPara()
      area.persony.push(parsePersona(lines, pIdx))
      sect = null
      continue
    }

    const maxLen = Math.max(...lines.map((l) => l.length))
    for (const t of lines) {
      let m: RegExpExecArray | null

      if (/^Definicja obszaru$/i.test(t)) { flushPara(); sect = area.definicja; inSources = false; list = null; inBullets = false; continue }
      if ((m = /^Analiza danych zastanych(?:\s*\((.+)\))?$/i.exec(t))) {
        flushPara()
        sect = emptySekcja(m[1] ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : null)
        area.analiza.push(sect)
        inSources = false; list = null; inBullets = false
        continue
      }
      if (/^Kluczowe wyzwania$/i.test(t)) { flushPara(); sect = area.wyzwania; inSources = false; list = null; inBullets = false; continue }
      if (/^Dowiedz się więcej!?$/i.test(t)) { flushPara(); sect = null; inSources = false; list = area.raporty; continue }
      if (/^Jeśli chcesz pogłębić wiedzę/i.test(t)) continue
      if ((m = /^Strona tytułowa raportu:\s*(.+)$/i.exec(t))) { flushPara(); inSources = false; list = area.raporty; list.push(m[1]); continue }
      if (/^Źródła:?$/i.test(t)) {
        flushPara()
        if (sect) { inSources = true; list = sect.zrodla; prevLen = maxLen }
        continue
      }

      const bullet = BULLET.test(t)
      const numbered = NUMBERED.exec(t)
      const inKey = sect === area.wyzwania

      // kolejne punkty numerowanej listy po bloku źródeł (np. „4. Stabilne finansowanie…”): wracamy do treści
      if (inSources && numbered && sect && /^\d+\./.test(sect.akapity[sect.akapity.length - 1] ?? '')) inSources = false

      if (bullet || (inKey && numbered && !inSources)) {
        flushPara()
        inSources = false
        const item = bullet ? t.replace(BULLET, '') : numbered![2]
        if (!bullet) area.wyzwania.numerowane = true
        if (sect) {
          sect.punkty.push(item)
          inBullets = true
        }
        prevLen = t.length
        continue
      }

      if (list === area.raporty && !sect) {
        // ciąg dalszy tytułu raportu (np. „autor: …”)
        if (list.length) list[list.length - 1] += ` ${t}`
        else list.push(t)
      } else if (inSources && list) {
        // nowe źródło: adres albo wiersz po krótkim (niełamanym) wierszu
        if (!list.length || /^https?:/.test(t) || prevLen < maxLen * 0.8) list.push(t)
        else list[list.length - 1] += ` ${t}`
      } else if (sect) {
        if (inBullets && sect.punkty.length) sect.punkty[sect.punkty.length - 1] += ` ${t}`
        else {
          if (para && (NUMBERED.test(t) || (SENTENCE_END.test(para) && prevLen < maxLen * 0.8))) flushPara()
          para = para ? `${para} ${t}` : t
        }
      }
      prevLen = t.length
    }
    flushPara()
  }
  const out = [...areas.values()].filter((o) => o.definicja.akapity.length + o.definicja.punkty.length + o.analiza.length + o.wyzwania.punkty.length > 0)
  return out.length >= 4 ? out : null
}

/** Najbardziej wymowne liczby obszaru: wartości procentowe (i mln/tys.) z kontekstem zdania. */
export function kluczoweLiczby(o: Obszar, max = 4): KluczowaLiczba[] {
  const texts = [...o.definicja.punkty, ...o.definicja.akapity, ...o.analiza.flatMap((s) => [...s.punkty, ...s.akapity])]
  const out: KluczowaLiczba[] = []
  const seen = new Set<string>()
  for (const text of texts) {
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const m = /(\d+(?:[,.]\d+)?\s?(?:%|mln|tys\.|pp))/.exec(sentence)
      if (!m || seen.has(m[1])) continue
      seen.add(m[1])
      const opis = sentence.length > 170 ? `${sentence.slice(0, 167).replace(/\s+\S*$/, '')}…` : sentence
      out.push({ wartosc: m[1], opis })
      if (out.length >= max) return out
    }
  }
  return out
}
