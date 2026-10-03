/** Tekst do porównań: małe litery, bez polskich znaków i nadmiarowych spacji. */
export function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase('pl-PL')
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
