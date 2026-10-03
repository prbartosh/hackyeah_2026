/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { Innowacja } from '@/types/innowacja'
import { youtubeId } from './youtube'

// Baza leży poza frontend/ (assets/), więc czytamy ją z dysku tylko w teście
const data = JSON.parse(
  readFileSync(new URL('../../../assets/innowacje-spoleczne/innowacje.json', import.meta.url), 'utf-8'),
) as Innowacja[]

describe('youtubeId', () => {
  it('rozpoznaje popularne formaty linków', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=o7UhDlebLJo')).toBe('o7UhDlebLJo')
    expect(youtubeId('https://www.youtube.com/watch?v=ev173g-d_vA&t=5s')).toBe('ev173g-d_vA')
    expect(youtubeId('https://youtu.be/JfmyToWVuOs')).toBe('JfmyToWVuOs')
    expect(youtubeId('https://www.youtube.com/embed/JfmyToWVuOs')).toBe('JfmyToWVuOs')
  })

  it('zwraca null dla pustych i obcych adresów', () => {
    expect(youtubeId(null)).toBeNull()
    expect(youtubeId('https://example.com/watch?v=abc')).toBeNull()
    expect(youtubeId('nie url')).toBeNull()
  })

  it('każdy film z bazy ma rozpoznawalny identyfikator', () => {
    const zFilmem = data.filter((r) => r.youtube_url)
    expect(zFilmem.length).toBeGreaterThan(0)
    for (const r of zFilmem) expect(youtubeId(r.youtube_url), r.slug).not.toBeNull()
  })
})
