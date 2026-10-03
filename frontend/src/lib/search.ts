import type { ProblemState, ResultItem, Role } from '@/types/chat'
import { kategoriaNazwa, type Innowacja } from '@/types/innowacja'

// Proste dopasowanie słów kluczowych na potrzeby trybu demonstracyjnego.
// Docelowo wyszukiwanie robi backend (docs/DEMO.md, narzędzie `search`).

const STOPWORDS = new Set([
  'jest', 'mamy', 'może', 'mogę', 'moja', 'mojej', 'mnie', 'tego', 'taki', 'także', 'które', 'który', 'która',
  'oraz', 'przez', 'przy', 'jako', 'bardzo', 'często', 'kiedy', 'gdzie', 'czego', 'czym', 'żeby', 'aby',
  'tylko', 'nawet', 'jeszcze', 'zawsze', 'nigdy', 'wiem', 'chcę', 'chciałabym', 'chciałbym', 'szukam',
  'czegoś', 'coś', 'kogoś', 'ktoś', 'dzień', 'dziennie', 'razy', 'nasz', 'naszej', 'naszym', 'nasza',
  'innowacja', 'rozwiązanie', 'problem', 'problemy', 'osoby', 'osób', 'osoba', 'pomoc', 'pomocy',
  'jestem', 'wielu', 'rzadko', 'sposobu', 'prowadzimy', 'samodzielnie',
])

// Ważenie IDF: słowa występujące w wielu rekordach (np. „domu”) ważą mniej niż rzadkie („demencja”)
const idfCache = new WeakMap<Innowacja[], Map<string, number>>()
function idf(data: Innowacja[]): Map<string, number> {
  let map = idfCache.get(data)
  if (map) return map
  const df = new Map<string, number>()
  for (const rec of data) {
    const all = new Set<string>()
    for (const [field] of FIELD_WEIGHTS) for (const stem of stems(rec[field] as string | null).keys()) all.add(stem)
    for (const stem of all) df.set(stem, (df.get(stem) ?? 0) + 1)
  }
  map = new Map([...df].map(([stem, n]) => [stem, Math.log((data.length + 1) / (n + 0.5))]))
  idfCache.set(data, map)
  return map
}

const STEM = 5

function stems(text: string | null | undefined): Map<string, string> {
  const out = new Map<string, string>()
  if (!text) return out
  for (const word of text.toLowerCase().split(/[^a-ząćęłńóśźż]+/)) {
    if (word.length < 4 || STOPWORDS.has(word)) continue
    const stem = word.slice(0, STEM)
    if (!out.has(stem)) out.set(stem, word)
  }
  return out
}

const FIELD_WEIGHTS: [keyof Innowacja, number][] = [
  ['problem', 3],
  ['nazwa', 3],
  ['grupa_docelowa', 2],
  ['opis', 1],
  ['kto_moze_skorzystac', 0.5],
]

// Kogo dotyczy → kategoria w bazie (filtr pomocniczy, nie warunek konieczny)
const AUDIENCE_CATEGORY: [RegExp, string][] = [
  [/starsz|senior/i, 'dla-seniorow'],
  [/dziec|młodzież|nastol|rodzin/i, 'dla-dzieci-mlodziezy-i-rodziny'],
  [/głuch|słabosłysz|niewidom|słabowidz|sensorycz/i, 'dla-osob-z-niepelnosprawnoscia-sensoryczna'],
  [/mobilno|wózk|porusza/i, 'dla-osob-o-ograniczonej-mobilnosci'],
  [/intelektual/i, 'dla-osob-z-niepelnosprawnoscia-intelektualna'],
  [/cudzoziem/i, 'dla-cudzoziemcow'],
  [/bezdom/i, 'dla-osob-w-kryzysie-bezdomnosci'],
  [/prac[ayę]|bezroboc/i, 'dla-rynku-pracy'],
]

const INSTITUTION = /gmin|jednost|samorząd|organizac|pozarząd|ośrod|instytuc/i

function firstSentence(text: string, max = 220): string {
  const m = text.match(/^.*?[.!?](\s|$)/)
  const sentence = (m ? m[0] : text).trim()
  return sentence.length > max ? sentence.slice(0, sentence.lastIndexOf(' ', max)) + '…' : sentence
}

function noDot(text: string): string {
  return text.trim().replace(/[.…]+$/, '')
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

export interface SearchResult {
  items: ResultItem[]
  no_match: boolean
}

const NO_MATCH_THRESHOLD = 25

export function search(data: Innowacja[], problem: ProblemState, role: Role | null, limit = 5): SearchResult {
  // Do dopasowania tematycznego tylko pola merytoryczne (skala czy zasoby nie opisują tematu)
  const queryText = [problem.opis, problem.kogo, problem.przyczyna].filter(Boolean).join(' ')
  const query = stems(queryText)
  const weights = idf(data)
  // Słowa z „Przyczyny” (główna trudność) ważą więcej
  const causeStems = new Set(stems(problem.przyczyna).keys())
  const categories = new Set(
    AUDIENCE_CATEGORY.filter(([re]) => re.test(`${problem.kogo ?? ''} ${problem.przyczyna ?? ''} ${problem.opis ?? ''}`)).map(([, c]) => c),
  )

  const scored = data.map((rec) => {
    let score = 0
    const matched = new Map<string, string>()
    for (const [field, weight] of FIELD_WEIGHTS) {
      const fieldStems = stems(rec[field] as string | null)
      for (const stem of query.keys()) {
        const word = fieldStems.get(stem)
        if (word) {
          score += weight * (weights.get(stem) ?? 1) * (causeStems.has(stem) ? 1.5 : 1)
          if (field !== 'kto_moze_skorzystac' && !matched.has(stem)) matched.set(stem, word)
        }
      }
    }
    if (rec.kategorie.some((c) => categories.has(c))) score += 8
    if (rec.wybrana_do_upowszechniania) score += 1
    // Rola wpływa na kolejność: instytucje widzą najpierw rozwiązania do wdrożenia przez instytucje
    const forInstitutions = INSTITUTION.test(rec.kto_moze_skorzystac)
    if (role && role !== 'mieszkaniec' && forInstitutions) score += 2
    if (role === 'mieszkaniec' && /osob|rodzin|opiekun|indywidual/i.test(rec.kto_moze_skorzystac)) score += 2
    return { rec, score, matched: [...matched.values()] }
  })

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, limit).filter((s) => s.score > 0)
  const noMatch = !top.length || top[0].score < NO_MATCH_THRESHOLD

  return {
    no_match: noMatch,
    items: top.map(({ rec, matched }) => {
      const why = [`Opis w bazie: „${firstSentence(rec.problem)}”`]
      if (matched.length) why.push(`Wspólne z Twoim opisem: ${matched.slice(0, 5).join(', ')}.`)
      if (rec.grupa_docelowa) why.push(`Dla kogo: ${noDot(lowerFirst(firstSentence(rec.grupa_docelowa, 160)))}.`)
      return {
        slug: rec.slug,
        nazwa: rec.nazwa,
        kategoria: kategoriaNazwa(rec.kategorie),
        organizacja: rec.organizacja,
        url_zrodlowy: rec.url_zrodlowy,
        wybrana_do_upowszechniania: rec.wybrana_do_upowszechniania,
        why_relevant: why.join(' '),
        difference: noMatch
          ? `Ta pozycja dotyczy: ${lowerFirst(firstSentence(rec.problem))} Sprawdź, czy da się ją dopasować do Twojej sytuacji.`
          : undefined,
      }
    }),
  }
}
