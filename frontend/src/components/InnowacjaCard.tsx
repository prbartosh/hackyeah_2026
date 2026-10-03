import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Star } from 'lucide-react'
import type { Innowacja } from '@/types/innowacja'

interface Props {
  innowacja: Innowacja
  kategoria: string | null
}

export default function InnowacjaCard({ innowacja: r, kategoria }: Props) {
  const { search } = useLocation()

  return (
    <article className="zs-card">
      {/* Bez obrazu: w sprawdzonych rekordach obraz_url to kod QR do strony ROPS, nie ilustracja innowacji */}
      <div className="zs-card-body">
        <div className="zs-card-top">
          {kategoria && <p className="zs-card-kicker">{kategoria}</p>}
          <ArrowUpRight size={20} aria-hidden="true" className="zs-card-arrow" />
        </div>
        <h3 className="zs-card-title">
          <Link to={`/innowacja/${r.slug}`} state={{ zasobnik: search }}>{r.nazwa}</Link>
        </h3>
        {r.wybrana_do_upowszechniania && (
          <p className="badge"><Star size={14} aria-hidden="true" /> Polecana przez ROPS</p>
        )}
        {r.problem && <p className="zs-card-problem">{r.problem}</p>}
      </div>
    </article>
  )
}
