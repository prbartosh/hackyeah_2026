export interface Item {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface ItemCreate {
  name: string
  description?: string | null
}
