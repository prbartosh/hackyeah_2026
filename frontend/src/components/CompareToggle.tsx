import { Check, Plus } from 'lucide-react'
import { useCompare } from '@/hooks/useCompare'
import { MAX_COMPARE } from '@/lib/compare'
import '@/styles/compare.css'

/** Przełącznik „Dodaj do porównania” (aria-pressed), maks. 3 pozycje. */
export default function CompareToggle({ slug, nazwa, tour }: { slug: string; nazwa: string; tour?: string }) {
  const { items, toggle } = useCompare()
  const pressed = items.some((i) => i.slug === slug)
  const blocked = !pressed && items.length >= MAX_COMPARE
  return (
    <button
      type="button"
      className="btn btn-ghost compare-toggle"
      aria-pressed={pressed}
      aria-disabled={blocked || undefined}
      onClick={() => { if (!blocked) toggle({ slug, nazwa }) }}
      data-tour={tour}
    >
      {pressed ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
      Dodaj do porównania
      <span className="visually-hidden">: {nazwa}{blocked ? ` (limit ${MAX_COMPARE} pozycji, usuń jedną, aby dodać kolejną)` : ''}</span>
    </button>
  )
}
