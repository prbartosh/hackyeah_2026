// 1 innowacja, 2–4 innowacje, 5+ innowacji (także 12–14 → innowacji)
export function liczbaInnowacji(n: number): string {
  if (n === 1) return '1 innowacja'
  const ostatnie = n % 10
  const dwie = n % 100
  return ostatnie >= 2 && ostatnie <= 4 && !(dwie >= 12 && dwie <= 14) ? `${n} innowacje` : `${n} innowacji`
}
