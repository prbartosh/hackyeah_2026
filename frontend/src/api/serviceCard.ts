// Kontrakt = backend/app/schemas/service_card.py. Przy zmianach schematu poprawiaj ten plik.
import { AdminApiError, call } from '@/admin/api'
import { PROBLEM_FIELDS, type ProblemState } from '@/types/chat'

export type ServiceCardRole = 'cus-ops' | 'partner'

export interface ServiceCard {
  cel: string
  odbiorcy: string
  kroki: string[]
  zasoby: string[]
  ryzyka: string[]
  wskazniki_sukcesu: string[]
}

export interface ServiceCardResponse {
  slug: string
  nazwa: string
  rola: ServiceCardRole
  karta: ServiceCard
}

/** Ten sam napis co TODO w backendzie: model oznacza nim brakujące dane. */
export const TODO_TEXT = 'do uzupełnienia'

export const isTodo = (text: string) => text.toLocaleLowerCase('pl-PL').includes(TODO_TEXT)

/** Stan problemu z czatu wysyłamy tylko, gdy użytkownik coś w nim opisał. */
export function problemOrNull(problem: ProblemState): ProblemState | null {
  return PROBLEM_FIELDS.some(({ key }) => problem[key].tekst?.trim()) ? problem : null
}

export async function createServiceCard(
  slug: string,
  rola: ServiceCardRole,
  problem: ProblemState | null,
): Promise<ServiceCardResponse> {
  try {
    return await call<ServiceCardResponse>(
      `/innovations/${encodeURIComponent(slug)}/service-card`,
      { method: 'POST', body: JSON.stringify({ rola, problem }) },
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

const list = (items: string[]) => items.map((i) => `- ${i}`).join('\n')

/** Treść zgłoszenia „Chcę to wdrożyć” do skrzynki panelu ROPS (limit formularza 4000 znaków). */
export function implementationRequestText(card: ServiceCardResponse, url: string, note: string): string {
  const { karta } = card
  const text = [
    `[Chcę wdrożyć] ${card.nazwa}`,
    `Karta innowacji: ${url}`,
    `Rola: ${card.rola === 'cus-ops' ? 'pracownik CUS / OPS' : 'samorząd, NGO lub ekspert'}`,
    note.trim() && `Wiadomość: ${note.trim()}`,
    `Cel: ${karta.cel}`,
    `Kroki:\n${list(karta.kroki)}`,
    `Zasoby:\n${list(karta.zasoby)}`,
  ].filter(Boolean).join('\n\n')
  return text.length > 4000 ? `${text.slice(0, 3999)}…` : text
}
