// Te same granice co w backendzie (schemas/ticket.py), żeby błąd był przy polu, a nie ogólny.
export const MIN_TEXT = 10
export const MAX_TEXT = 4000
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
// Ciąg 11 cyfr wygląda jak PESEL; formularz prosi, żeby takich danych nie wpisywać.
const PESEL_RE = /(?<!\d)\d{11}(?!\d)/

export type ReportErrors = { text?: string; email?: string }

export function validateReport(text: string, email: string): ReportErrors {
  const errors: ReportErrors = {}
  const length = text.trim().length
  if (length < MIN_TEXT) errors.text = `Opisz sprawę w kilku zdaniach (co najmniej ${MIN_TEXT} znaków).`
  else if (length > MAX_TEXT) errors.text = `Opis jest za długi (najwyżej ${MAX_TEXT} znaków). Skróć go.`
  if (email.trim() && !EMAIL_RE.test(email.trim())) {
    errors.email = 'Podaj poprawny adres e-mail, na przykład imie@domena.pl, albo zostaw pole puste.'
  }
  return errors
}

export function looksLikePesel(text: string): boolean {
  return PESEL_RE.test(text)
}
