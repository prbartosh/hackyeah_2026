import type { ChatEvent, ChatRequest } from '@/types/chat'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

const EVENT_TYPES = new Set(['text', 'role', 'question', 'problem_update', 'summary', 'results', 'error'])

/**
 * Wysyła pełną historię i stan problemu do backendu, odbiera strumień SSE.
 * Gdy backend nie udostępnia jeszcze /chat, przełącza się na tryb demonstracyjny.
 */
export async function* streamChat(req: ChatRequest, signal?: AbortSignal): AsyncGenerator<ChatEvent> {
  let res: Response | null = null
  try {
    res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(req),
      signal,
    })
  } catch (e) {
    if (signal?.aborted) throw e
  }

  if (!res?.ok || !res.body || !res.headers.get('content-type')?.includes('text/event-stream')) {
    const { runDemo } = await import('@/api/demoEngine')
    yield { type: 'demo_mode' }
    yield* runDemo(req)
    return
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    let sep: number
    while ((sep = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(sep).replace(/^\r?\n\r?\n/, '')
      const event = parseBlock(block)
      if (event) yield event
    }
  }
}

function parseBlock(block: string): ChatEvent | null {
  let type = 'message'
  const data: string[] = []
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) type = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
  }
  if (!EVENT_TYPES.has(type) || !data.length) return null
  try {
    return { type, ...JSON.parse(data.join('\n')) } as ChatEvent
  } catch {
    return null
  }
}
