// Kontrakt = backend/app/schemas/plain_language.py. Przy zmianach schematu poprawiaj ten plik.
import { AdminApiError, call } from '@/admin/api'

export interface PlainLanguageResponse {
  slug: string
  nazwa: string
  zdania: string[]
  zrodlo: string
}

export async function getPlainLanguage(slug: string): Promise<PlainLanguageResponse> {
  try {
    return await call<PlainLanguageResponse>(
      `/innovations/${encodeURIComponent(slug)}/prosty-jezyk`,
      { method: 'POST' },
      false,
    )
  } catch (e) {
    // nginx odpowiada na limit bez JSON, więc komunikat dopisujemy sami
    if (e instanceof AdminApiError && e.status === 429) {
      throw new AdminApiError(429, 'Za dużo zapytań w krótkim czasie. Odczekaj minutę i spróbuj ponownie.')
    }
    throw e
  }
}
