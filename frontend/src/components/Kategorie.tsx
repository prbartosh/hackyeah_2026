import { Accessibility, Baby, Brain, Briefcase, Ear, Globe, House, LayoutGrid, Stethoscope, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { liczbaInnowacji } from '@/lib/plural'
import type { Kategoria } from '@/types/innowacja'

interface Props {
  kategorie: Kategoria[]
  razem: number
  wybrana: string | null
  onSelect: (slug: string | null) => void
}

const IKONY: Record<string, LucideIcon> = {
  'dla-cudzoziemcow': Globe,
  'dla-dzieci-mlodziezy-i-rodziny': Baby,
  'dla-osob-o-ograniczonej-mobilnosci': Accessibility,
  'dla-osob-w-kryzysie-bezdomnosci': House,
  'dla-osob-z-niepelnosprawnoscia-intelektualna': Brain,
  'dla-osob-z-niepelnosprawnoscia-sensoryczna': Ear,
  'dla-rynku-pracy': Briefcase,
  'dla-seniorow': Users,
  'dla-zdrowia-i-medycyny': Stethoscope,
}

export default function Kategorie({ kategorie, razem, wybrana, onSelect }: Props) {
  const najwiecej = Math.max(1, ...kategorie.map((k) => k.liczba_innowacji))
  return (
    <section aria-labelledby="zs-kategorie-h" className="zs-cats" data-tour="zasobnik-kategorie">
      <h2 id="zs-kategorie-h" className="zs-overline">Dla kogo szukasz rozwiązania?</h2>
      <ul className="zs-tiles">
        <li>
          <button type="button" className="zs-tile" aria-pressed={wybrana === null} onClick={() => onSelect(null)}>
            <LayoutGrid size={22} aria-hidden="true" className="zs-tile-icon" />
            <span className="zs-tile-name">Wszystkie kategorie</span>
            <span className="zs-tile-count" aria-hidden="true">{razem}</span>
            <span className="visually-hidden">, {liczbaInnowacji(razem)}</span>
          </button>
        </li>
        {kategorie.map((k) => {
          const Icon = IKONY[k.slug] ?? Users
          return (
            <li key={k.slug}>
              <button
                type="button"
                className="zs-tile"
                aria-pressed={wybrana === k.slug}
                onClick={() => onSelect(wybrana === k.slug ? null : k.slug)}
              >
                <Icon size={22} aria-hidden="true" className="zs-tile-icon" />
                <span className="zs-tile-name">{k.nazwa}</span>
                <span className="zs-tile-count" aria-hidden="true">{k.liczba_innowacji}</span>
                <span className="zs-tile-meter" aria-hidden="true"><span style={{ width: `${(k.liczba_innowacji / najwiecej) * 100}%` }} /></span>
                <span className="visually-hidden">, {liczbaInnowacji(k.liczba_innowacji)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
