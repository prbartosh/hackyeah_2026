import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { kluczoweLiczby, parseMapaWyzwan } from './mapaWyzwan'

const dir = '../assets/mapa-wyzwan/text'
const tresc = readFileSync(`${dir}/${readdirSync(dir)[0]}`, 'utf8')

describe('parseMapaWyzwan', () => {
  it('zwraca null bez tekstu albo przy innym układzie', () => {
    expect(parseMapaWyzwan(null)).toBeNull()
    expect(parseMapaWyzwan('<!-- page 1 -->\nCoś innego')).toBeNull()
  })

  it('czyta wszystkie osiem obszarów z sekcjami', () => {
    const areas = parseMapaWyzwan(tresc)!
    expect(areas.map((a) => a.nazwa)).toEqual([
      'Rodzina i piecza zastępcza', 'Bezdomność', 'Niepełnosprawność', 'Ubóstwo',
      'Integracja cudzoziemców', 'Zdrowie', 'Zdrowie psychiczne', 'Seniorzy',
    ])
    for (const a of areas) {
      expect(a.definicja.akapity.length + a.definicja.punkty.length).toBeGreaterThan(0)
      expect(a.wyzwania.punkty.length).toBeGreaterThan(3)
      expect(a.persony.length).toBeGreaterThan(0)
      expect(a.persony.every((p) => p.imie && p.cele.length && p.wyzwania.length)).toBe(true)
    }
  })

  it('dzieli persony na trzy kolumny również bez nagłówków w PDF', () => {
    const areas = parseMapaWyzwan(tresc)!
    const tomek = areas[3].persony[0]
    expect(tomek.imie).toBe('Tomek')
    expect(tomek.cele).toHaveLength(3)
    expect(tomek.motywacje[0]).toContain('Poznanie nowych osób')
    expect(areas[6].persony.map((p) => p.imie)).toEqual(['Mateusz', 'Karina'])
  })

  it('sklejone punkty, numeracja i źródła', () => {
    const areas = parseMapaWyzwan(tresc)!
    expect(areas[4].wyzwania.numerowane).toBe(true)
    expect(areas[4].wyzwania.punkty).toHaveLength(7)
    expect(areas[3].wyzwania.punkty.some((p) => p.startsWith('ubóstwo dzieci'))).toBe(true)
    expect(areas[3].analiza[0].zrodla.some((z) => z.startsWith('https://www.eapn.org.pl'))).toBe(true)
    expect(areas[6].analiza.map((s) => s.tytul)).toEqual(['Dzieci i młodzież', 'Osoby dorosłe'])
  })

  it('wybiera liczby z kontekstem', () => {
    const l = kluczoweLiczby(parseMapaWyzwan(tresc)![2])
    expect(l.length).toBeGreaterThan(0)
    expect(l[0].wartosc).toMatch(/%|mln/)
  })
})
