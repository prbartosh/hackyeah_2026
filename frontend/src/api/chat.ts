import type { ChatRequest, ServerEvent } from '@/types/chat'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

const EVENT_NAMES = new Set(['text', 'role', 'problem_update', 'question', 'summary', 'results', 'done', 'error'])

/** Błąd, który można pokazać użytkownikowi (komunikat po polsku). */
export class ChatError extends Error {}

/**
 * POST /chat → strumień SSE. fetch + ReadableStream, bo EventSource obsługuje tylko GET.
 * Generator kończy się po zdarzeniu `done` lub `error`. Błędy sieci i serwera rzucają ChatError
 * z komunikatem po polsku, który interfejs pokazuje użytkownikowi razem z przyciskiem „Spróbuj ponownie”.
 */
export async function* streamChat(req: ChatRequest, signal?: AbortSignal): AsyncGenerator<ServerEvent> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(req),
      signal,
    })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new ChatError('Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.')
  }

  if (!res.ok) throw new ChatError(await describeHttpError(res))
  if (!res.body) throw new ChatError('Serwer nie zwrócił odpowiedzi.')

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      let match: RegExpExecArray | null
      while ((match = /\r?\n\r?\n/.exec(buffer))) {
        const block = buffer.slice(0, match.index)
        buffer = buffer.slice(match.index + match[0].length)
        const event = parseBlock(block)
        if (!event) continue
        yield event
        if (event.name === 'done' || event.name === 'error') return
      }
    }
  } catch (e) {
    if (signal?.aborted) throw e
    throw new ChatError('Połączenie z serwerem zostało przerwane. Spróbuj ponownie.')
  }
  throw new ChatError('Połączenie z serwerem zostało przerwane. Spróbuj ponownie.')
}

function parseBlock(block: string): ServerEvent | null {
  let name = 'message'
  const data: string[] = []
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith(':')) continue // komentarz / keep-alive
    if (line.startsWith('event:')) name = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
  }
  if (!EVENT_NAMES.has(name) || !data.length) return null
  try {
    return { name, data: JSON.parse(data.join('\n')) } as ServerEvent
  } catch {
    return null
  }
}

async function describeHttpError(res: Response): Promise<string> {
  if (res.status === 422) {
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') return `Nie można kontynuować tej rozmowy: ${body.detail}. Zacznij od nowa.`
    } catch {
      /* brak szczegółów */
    }
    return 'Nie można kontynuować tej rozmowy. Zacznij od nowa.'
  }
  if (res.status === 429) return 'Za dużo zapytań naraz. Odczekaj minutę i spróbuj ponownie.'
  if (res.status === 503) {
    // Wyłączony czat albo wyczerpany budżet dzienny: backend podaje komunikat w detail.
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') return body.detail
    } catch {
      /* 503 bez JSON (np. z nginx) */
    }
  }
  if (res.status === 404 || res.status === 502 || res.status === 503 || res.status === 504) {
    return 'Serwer jest chwilowo niedostępny. Spróbuj ponownie za chwilę.'
  }
  return 'Coś poszło nie tak po stronie serwera. Spróbuj ponownie.'
}
