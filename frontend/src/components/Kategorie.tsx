import { liczbaInnowacji } from '@/lib/plural'
import type { Kategoria } from '@/types/innowacja'

interface Props {
  kategorie: Kategoria[]
  razem: number
  wybrana: string | null
  onSelect: (slug: string | null) => void
}

export default function Kategorie({ kategorie, razem, wybrana, onSelect }: Props) {
  return (
    <section aria-labelledby="zs-kategorie-h" className="zs-cats">
      <h2 id="zs-kategorie-h" className="zs-overline">Kategorie</h2>
      <ul className="zs-chips">
        <li>
          <button type="button" className="zs-chip" aria-pressed={wybrana === null} onClick={() => onSelect(null)}>
            Wszystkie kategorie
            <span className="zs-chip-count" aria-hidden="true">{razem}</span>
            <span className="visually-hidden">, {liczbaInnowacji(razem)}</span>
          </button>
        </li>
        {kategorie.map((k) => (
          <li key={k.slug}>
            <button
              type="button"
              className="zs-chip"
              aria-pressed={wybrana === k.slug}
              onClick={() => onSelect(wybrana === k.slug ? null : k.slug)}
            >
              {k.nazwa}
              <span className="zs-chip-count" aria-hidden="true">{k.liczba_innowacji}</span>
              <span className="visually-hidden">, {liczbaInnowacji(k.liczba_innowacji)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
