import { describe, expect, it } from 'vitest'
import { normalizeText } from './text'

describe('normalizeText', () => {
  it('usuwa polskie znaki, wielkość liter i nadmiar spacji', () => {
    expect(normalizeText('  Pomoc   SPOŁECZNA – Świadczenia ')).toBe('pomoc spoleczna – swiadczenia')
    expect(normalizeText('Łódź, źródło')).toBe('lodz, zrodlo')
  })
})
