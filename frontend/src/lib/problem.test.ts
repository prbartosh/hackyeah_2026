import { describe, expect, it } from 'vitest'
import { problemAsText } from './problem'
import { emptyProblem } from '@/types/chat'

describe('problemAsText', () => {
  it('składa wypełnione pola w kolejności panelu, pomija puste', () => {
    const problem = emptyProblem()
    problem.problemy.tekst = 'brak opieki po wyjściu ze szpitala'
    problem.grupy_docelowe.tekst = ' seniorzy '
    problem.skale.tekst = '   '
    expect(problemAsText(problem)).toBe('Kogo dotyczy: seniorzy\nPrzyczyna: brak opieki po wyjściu ze szpitala')
  })

  it('zwraca pusty tekst dla pustego problemu', () => {
    expect(problemAsText(emptyProblem())).toBe('')
  })
})
