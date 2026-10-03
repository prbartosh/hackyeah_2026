import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

/**
 * Autozapis szkicu: `schedule()` po każdej zmianie, zapis po krótkiej przerwie w pisaniu.
 * Brak limitu czasu sesji: niezapisane zmiany są zapisywane także przy opuszczeniu ekranu.
 */
export function useAutosave(save: () => Promise<void>, delay = 900) {
  const [state, setState] = useState<SaveState>('idle')
  const saveRef = useRef(save)
  const timer = useRef<number | undefined>(undefined)
  const dirty = useRef(false)
  const running = useRef<Promise<void> | null>(null)

  useEffect(() => {
    saveRef.current = save
  })

  const run = useCallback(async () => {
    if (running.current) await running.current
    if (!dirty.current) return
    dirty.current = false
    setState('saving')
    const job = saveRef.current()
      .then(() => setState(dirty.current ? 'pending' : 'saved'))
      .catch(() => {
        dirty.current = true
        setState('error')
      })
      .finally(() => {
        running.current = null
      })
    running.current = job
    await job
  }, [])

  const schedule = useCallback(() => {
    dirty.current = true
    setState('pending')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void run(), delay)
  }, [delay, run])

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    await run()
  }, [run])

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      if (dirty.current) void saveRef.current()
    },
    [],
  )

  return { state, schedule, flush }
}

export const SAVE_TEXT: Record<SaveState, string> = {
  idle: '',
  pending: 'Zmiany czekają na zapis…',
  saving: 'Zapisywanie…',
  saved: 'Szkic zapisany. Możesz wrócić do niego później.',
  error: 'Nie udało się zapisać szkicu. Sprawdź połączenie i spróbuj ponownie.',
}
