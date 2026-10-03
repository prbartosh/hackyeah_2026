import { useCallback, useEffect, useState } from 'react'

import { itemsApi } from '@/api/items'
import type { Item } from '@/types/item'

export function useItems() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await itemsApi.list())
      setError(null)
    } catch {
      setError('Nie udało się pobrać listy. Spróbuj ponownie za chwilę.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { items, loading, error, reload }
}
