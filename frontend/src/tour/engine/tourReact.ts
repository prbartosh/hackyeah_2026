import { createContext, useContext } from 'react'
import type { TourChapter } from '@/tour/types'
import type { TourState } from '@/tour/engine/store'

export interface TourApi {
  chapters: TourChapter[]
  state: TourState
  /** Otwiera ekran startowy (spis rozdziałów); jeśli przewodnik jest zminimalizowany, wraca do kroku. */
  openMenu(): void
  /** Uruchamia rozdział od pierwszego kroku (też osobny, np. przewodnik dla sędziego). */
  startChapter(chapterId: string): boolean
}

export const TourReactContext = createContext<TourApi | null>(null)

export function useTour(): TourApi {
  const value = useContext(TourReactContext)
  if (!value) throw new Error('useTour wymaga TourProvider')
  return value
}
