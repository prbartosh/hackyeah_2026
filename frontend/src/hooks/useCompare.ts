import { useCallback, useSyncExternalStore } from 'react'
import { parseStored, removeItem, toggleItem, type CompareItem } from '@/lib/compare'

const KEY = 'splot:porownanie'
const listeners = new Set<() => void>()

function load(): CompareItem[] {
  try {
    return parseStored(sessionStorage.getItem(KEY))
  } catch {
    return []
  }
}

// Migawka musi być stabilna między odczytami, dlatego trzymamy ją w module
let current: CompareItem[] = load()
const SERVER: CompareItem[] = []

function set(next: CompareItem[]) {
  if (next === current) return
  current = next
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* brak sessionStorage: porównanie działa do końca wizyty na stronie */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Opróżnia porównanie poza komponentem (np. po rozdziale przewodnika). */
export function clearCompare() { set([]) }

export function useCompare() {
  const items = useSyncExternalStore(subscribe, () => current, () => SERVER)
  const toggle = useCallback((item: CompareItem) => set(toggleItem(current, item)), [])
  const remove = useCallback((slug: string) => set(removeItem(current, slug)), [])
  return { items, toggle, remove }
}
