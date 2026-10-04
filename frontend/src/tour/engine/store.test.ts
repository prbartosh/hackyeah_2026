// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createTourStore } from '@/tour/engine/store'
import { findStep, flatSteps, isValidPosition, nextChapter, samePlace } from '@/tour/engine/steps'
import type { TourChapter } from '@/tour/types'

const step = (id: string) => ({ id, title: id, body: ['x'] })
const chapters: TourChapter[] = [
  { id: 'a', title: 'A', summary: '', minutes: 1, steps: [step('a.1'), step('a.2')] },
  { id: 'pusty', title: 'Pusty', summary: '', minutes: 1, steps: [] },
  { id: 'b', title: 'B', summary: '', minutes: 1, steps: [step('b.1')] },
]

beforeEach(() => { sessionStorage.clear(); localStorage.clear() })

describe('kroki', () => {
  it('spłaszcza i znajduje kroki, pomija puste rozdziały przy następnym', () => {
    expect(flatSteps(chapters).map((r) => r.step.id)).toEqual(['a.1', 'a.2', 'b.1'])
    expect(findStep(chapters, 'b.1')?.chapter.id).toBe('b')
    expect(nextChapter(chapters, 'a')?.id).toBe('b')
    expect(nextChapter(chapters, 'b')).toBeUndefined()
    expect(isValidPosition(chapters, 'a', 2)).toBe(false)
  })

  it('samePlace: ta sama trasa nie wymaga nawigacji', () => {
    expect(samePlace('/czat?x=1', '/czat')).toBe(true)
    expect(samePlace('/czat', '/czat?x=1')).toBe(false)
    expect(samePlace('/inna', '/czat')).toBe(false)
  })
})

describe('store', () => {
  it('przechodzi kroki, kończy rozdział i zapisuje postęp', () => {
    const s = createTourStore(chapters)
    expect(s.start('a')).toBe(true)
    s.next()
    expect(s.getState()).toMatchObject({ screen: 'step', chapterId: 'a', stepIndex: 1 })
    s.prev()
    expect(s.getState().stepIndex).toBe(0)
    s.next(); s.next()
    expect(s.getState().screen).toBe('chapterDone')
    expect(s.getProgress().completed).toEqual(['a'])
    s.start('b')
    s.next()
    expect(s.getState().screen).toBe('summary')
  })

  it('wznawia po odświeżeniu (sessionStorage) i pamięta ostatnią pozycję', () => {
    const s = createTourStore(chapters)
    s.start('a', 1)
    s.minimize()
    const again = createTourStore(chapters)
    expect(again.getState()).toMatchObject({ screen: 'step', chapterId: 'a', stepIndex: 1, minimized: true })
    expect(again.getProgress().last).toEqual({ chapterId: 'a', stepIndex: 1 })
  })

  it('goTo po id kroku, odrzuca nieznane; „od początku” czyści ukończone', () => {
    const s = createTourStore(chapters)
    expect(s.goTo('b.1')).toBe(true)
    expect(s.goTo('nie.ma')).toBe(false)
    s.next()
    s.startFromBeginning()
    expect(s.getState()).toMatchObject({ chapterId: 'a', stepIndex: 0 })
    expect(s.getProgress().completed).toEqual([])
  })

  it('zepsuty storage nie przewraca silnika', () => {
    sessionStorage.setItem('tour-state', '{zepsute')
    localStorage.setItem('tour-progress', 'null')
    expect(createTourStore(chapters).getState().screen).toBe('closed')
  })
})
