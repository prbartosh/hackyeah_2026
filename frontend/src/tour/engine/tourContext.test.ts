// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createTourContext } from '@/tour/engine/tourContext'

beforeEach(() => sessionStorage.clear())

describe('TourContext', () => {
  it('get/set trwa w sessionStorage', () => {
    createTourContext().set('token', 'abc')
    expect(createTourContext().get('token')).toBe('abc')
  })

  it('api dokłada token tylko z admin: true i rzuca przy błędzie', async () => {
    const calls: { url: string; auth: string | null }[] = []
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, auth: new Headers(init.headers).get('Authorization') })
      return url.includes('zle') ? new Response('{"detail":"nie"}', { status: 404 }) : new Response('{"ok":1}', { status: 200 })
    }) as unknown as typeof fetch
    const ctx = createTourContext({ baseUrl: '/api/v1', fetchImpl, tokenProvider: () => 'sekret' })
    await ctx.api('/a')
    await ctx.api('/b', { admin: true })
    expect(calls).toEqual([{ url: '/api/v1/a', auth: null }, { url: '/api/v1/b', auth: 'Bearer sekret' }])
    await expect(ctx.api('/zle')).rejects.toThrow(/404.*nie/)
    const noToken = createTourContext({ baseUrl: '/api/v1', fetchImpl, tokenProvider: () => null })
    await expect(noToken.api('/b', { admin: true })).rejects.toThrow()
  })
})
