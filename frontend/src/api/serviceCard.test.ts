import { describe, expect, it } from 'vitest'
import { implementationRequestText, isTodo, problemOrNull, type ServiceCardResponse } from '@/api/serviceCard'
import { emptyProblem } from '@/types/chat'

const card: ServiceCardResponse = {
  slug: 'rama',
  nazwa: 'Rama dla wózków',
  rola: 'cus-ops',
  karta: {
    cel: 'Uczeń na wózku wjeżdża do klasy',
    odbiorcy: 'Uczniowie z niepełnosprawnością ruchową',
    kroki: ['Rozpoznanie', 'Zamówienie', 'Montaż'],
    zasoby: ['Budżet: do uzupełnienia'],
    ryzyka: ['Opóźnienia'],
    wskazniki_sukcesu: ['Liczba uczniów'],
  },
}

describe('isTodo', () => {
  it('rozpoznaje oznaczenie brakujących danych bez względu na wielkość liter', () => {
    expect(isTodo('Budżet: Do uzupełnienia')).toBe(true)
    expect(isTodo('Montaż rampy')).toBe(false)
  })
})

describe('problemOrNull', () => {
  it('zwraca null dla pustego problemu', () => {
    expect(problemOrNull(emptyProblem())).toBeNull()
  })

  it('zwraca problem, gdy choć jedno pole ma tekst', () => {
    const problem = emptyProblem()
    problem.miejsca.tekst = 'szkoła podstawowa'
    expect(problemOrNull(problem)).toBe(problem)
  })
})

describe('implementationRequestText', () => {
  it('składa treść zgłoszenia z karty i wiadomości', () => {
    const text = implementationRequestText(card, 'http://x/innowacja/rama', '  SP 3 w Bochni  ')
    expect(text.startsWith('[Chcę wdrożyć] Rama dla wózków')).toBe(true)
    expect(text).toContain('Wiadomość: SP 3 w Bochni')
    expect(text).toContain('- Montaż')
    expect(text).toContain('pracownik CUS / OPS')
  })

  it('pomija pustą wiadomość i mieści się w limicie formularza', () => {
    const long = { ...card, karta: { ...card.karta, kroki: Array(7).fill('x'.repeat(900)) } }
    const text = implementationRequestText(long, 'u', '   ')
    expect(text).not.toContain('Wiadomość:')
    expect(text.length).toBeLessThanOrEqual(4000)
  })
})
