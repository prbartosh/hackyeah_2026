import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCategories, listInnovations } from './innovations'

function mockFetch(response: Partial<Response>) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('listInnovations', () => {
  it('przekazuje filtry w adresie i zwraca listę', async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => [{ slug: 'a' }] })
    const list = await listInnovations({ kategoria: 'dla-seniorow', q: ' wózek ', wybrane: true })
    expect(list).toEqual([{ slug: 'a' }])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/innovations?kategoria=dla-seniorow&q=w%C3%B3zek&wybrane=true')
  })

  it('bez filtrów nie dokleja zapytania', async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => [] })
    await listInnovations()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/innovations')
  })

  it('rzuca wyjątek przy błędzie HTTP', async () => {
    mockFetch({ ok: false, status: 500 })
    await expect(listInnovations()).rejects.toThrow('HTTP 500')
  })
})

describe('getCategories', () => {
  it('zwraca kategorie z backendu', async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => [{ slug: 'x', nazwa: 'X', liczba_innowacji: 2 }] })
    expect(await getCategories()).toHaveLength(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/categories')
  })

  it('rzuca wyjątek przy błędzie HTTP', async () => {
    mockFetch({ ok: false, status: 404 })
    await expect(getCategories()).rejects.toThrow('HTTP 404')
  })
})
