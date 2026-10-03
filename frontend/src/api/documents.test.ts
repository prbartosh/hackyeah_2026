import { describe, expect, it } from 'vitest'
import { splitPages } from './documents'

describe('splitPages', () => {
  it('dzieli treść po znacznikach stron i pomija puste', () => {
    const tresc = '\n\n<!-- page 1 -->\n\nMAPA WYZWAŃ\n<!-- page 2 -->\n\n<!-- page 3 -->\nZakres tematyczny'
    expect(splitPages(tresc)).toEqual([
      { strona: 1, tekst: 'MAPA WYZWAŃ' },
      { strona: 3, tekst: 'Zakres tematyczny' },
    ])
  })

  it('tekst bez znaczników (wskaźnik) to jedna strona 0', () => {
    expect(splitPages('Opis wskaźnika\n| powiat | 2024 |')).toEqual([
      { strona: 0, tekst: 'Opis wskaźnika\n| powiat | 2024 |' },
    ])
  })
})
