import { Link, useLocation } from 'react-router-dom'
import { Building2, Target } from 'lucide-react'
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
        </div>
        <h3 className="zs-card-title">
          <Link to={`/innowacja/${r.slug}`} state={{ zasobnik: search }}>{r.nazwa}</Link>
        </h3>
        {r.wybrana_do_upowszechniania && (
          <p className="badge">Polecana przez ROPS</p>
        )}
        {r.problem && <p className="zs-card-problem">{r.problem}</p>}
        {(r.grupa_docelowa || r.organizacja) && (
          <dl className="zs-card-meta">
            {r.grupa_docelowa && (
              <div><dt><Target size={14} aria-hidden="true" /><span className="visually-hidden">Grupa docelowa</span></dt><dd>{r.grupa_docelowa}</dd></div>
            )}
            {r.organizacja && (
              <div><dt><Building2 size={14} aria-hidden="true" /><span className="visually-hidden">Organizacja</span></dt><dd>{r.organizacja}</dd></div>
            )}
          </dl>
        )}
      </div>
    </article>
  )
}
