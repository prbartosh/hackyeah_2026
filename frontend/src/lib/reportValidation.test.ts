import { describe, expect, it } from 'vitest'
import { looksLikePesel, MAX_TEXT, validateReport } from './reportValidation'

const OK = 'Mama ma demencję i ciągle dzwoni z pytaniem o leki.'

describe('validateReport', () => {
  it('przepuszcza poprawny opis bez e-maila', () => {
    expect(validateReport(OK, '')).toEqual({})
    expect(validateReport(OK, '   ')).toEqual({})
  })

  it('odrzuca za krótki opis (po obcięciu spacji)', () => {
    expect(validateReport('krótki', '').text).toBeDefined()
    expect(validateReport('   abc   ', '').text).toBeDefined()
  })

  it('odrzuca za długi opis', () => {
    expect(validateReport('a'.repeat(MAX_TEXT + 1), '').text).toBeDefined()
    expect(validateReport('a'.repeat(MAX_TEXT), '').text).toBeUndefined()
  })

  it('akceptuje poprawny e-mail, także ze spacjami na brzegach', () => {
    expect(validateReport(OK, 'jan.kowalski@example.pl').email).toBeUndefined()
    expect(validateReport(OK, '  jan@example.pl ').email).toBeUndefined()
  })

  it('odrzuca e-mail bez domeny z kropką i ze spacją w środku', () => {
    expect(validateReport(OK, 'jan@gmail').email).toBeDefined()
    expect(validateReport(OK, 'zly-adres').email).toBeDefined()
    expect(validateReport(OK, 'jan kowalski@example.pl').email).toBeDefined()
  })
})

describe('looksLikePesel', () => {
  it('wykrywa 11 cyfr', () => {
    expect(looksLikePesel('mój pesel 44051401359 proszę')).toBe(true)
  })

  it('nie reaguje na krótsze i dłuższe ciągi cyfr', () => {
    expect(looksLikePesel('telefon 123456789')).toBe(false)
    expect(looksLikePesel('numer 123456789012')).toBe(false)
    expect(looksLikePesel('kwota 12 000 zł')).toBe(false)
  })
})
