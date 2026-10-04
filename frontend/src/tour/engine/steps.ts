// Nawigacja po rozdziałach i krokach (czyste funkcje, bez DOM).
import type { TourChapter, TourStep } from '@/tour/types'

export interface StepRef {
  chapterIndex: number
  stepIndex: number
  chapter: TourChapter
  step: TourStep
}

export function flatSteps(chapters: TourChapter[]): StepRef[] {
  return chapters.flatMap((chapter, chapterIndex) =>
    chapter.steps.map((step, stepIndex) => ({ chapterIndex, stepIndex, chapter, step })),
  )
}

export function findStep(chapters: TourChapter[], stepId: string): StepRef | undefined {
  return flatSteps(chapters).find((r) => r.step.id === stepId)
}

/** Rozdziały pełnego przewodnika, które mają kroki (puste są w spisie jako „wkrótce”, osobne są poza kolejką). */
export function playable(chapters: TourChapter[]): TourChapter[] {
  return chapters.filter((c) => c.steps.length > 0 && !c.standalone)
}

export function nextChapter(chapters: TourChapter[], chapterId: string): TourChapter | undefined {
  const list = playable(chapters)
  const i = list.findIndex((c) => c.id === chapterId)
  return i >= 0 ? list[i + 1] : undefined
}

export function isValidPosition(chapters: TourChapter[], chapterId: string | null, stepIndex: number): boolean {
  const c = chapters.find((x) => x.id === chapterId)
  return !!c && Number.isInteger(stepIndex) && stepIndex >= 0 && stepIndex < c.steps.length
}

/** Czy bieżąca ścieżka to już trasa kroku (bez query w trasie porównujemy samą ścieżkę). */
export function samePlace(current: string, route: string): boolean {
  const [routePath, routeQuery] = route.split('#')[0].split('?')
  const [curPath, curQuery] = current.split('#')[0].split('?')
  if (routePath !== curPath) return false
  return routeQuery === undefined || routeQuery === curQuery
}
