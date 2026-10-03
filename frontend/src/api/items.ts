import { request } from '@/api/client'
import type { Item, ItemCreate } from '@/types/item'

export const itemsApi = {
  list: () => request<Item[]>('/items'),
  create: (data: ItemCreate) =>
    request<Item>('/items', { method: 'POST', body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/items/${id}`, { method: 'DELETE' }),
}
