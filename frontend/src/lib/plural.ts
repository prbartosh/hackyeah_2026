/** Polska odmiana po liczbie: 1 ocena, 2–4 oceny, 5+ ocen (także 12–14 → ocen). */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return `1 ${one}`
  const ostatnie = n % 10
  const dwie = n % 100
  return ostatnie >= 2 && ostatnie <= 4 && !(dwie >= 12 && dwie <= 14) ? `${n} ${few}` : `${n} ${many}`
}

export function liczbaInnowacji(n: number): string {
  return plural(n, 'innowacja', 'innowacje', 'innowacji')
}
