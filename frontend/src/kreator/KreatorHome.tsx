import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Lightbulb, Coins, LayoutGrid } from 'lucide-react'
import { Loading, useLoad } from '@/admin/ui'
import { kreator } from '@/kreator/api'
import { formatDay } from '@/kreator/helpers'
import { DRAFT_LINKS, getDrafts } from '@/kreator/storage'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

/** Wejście do Kreatora pomysłów: fiszka zawsze, wniosek tylko w czasie naboru, canva. */
export default function KreatorHome() {
  useDocumentTitle('Kreator pomysłów · Splot')
  const [drafts] = useState(getDrafts)
  const { data, loading } = useLoad(() => kreator.nabory({}), [])
  const active = data?.aktywne ?? []

  return (
    <div className="container page kreator">
      <h1>Kreator pomysłów</h1>
      <p className="lead">Masz pomysł na rozwiązanie społeczne? Opisz go krok po kroku. Nie musisz niczego umieć, wystarczy kilka zdań. Zespół ROPS odpowie na zgłoszenie.</p>

      <ul className="tile-list" data-tour="kreator-sciezki">
        <li className="tile">
          <h2><Lightbulb size={22} aria-hidden="true" /> Fiszka pomysłu</h2>
          <p>Opisz, na czym polega pomysł, dla kogo jest i na jakim jest etapie. AI może wstępnie wypełnić pola z Twojego opisu.</p>
          <Link to="/kreator/fiszka" className="btn btn-primary">Opisz pomysł</Link>
        </li>
        <li className="tile">
          <h2><Coins size={22} aria-hidden="true" /> Skąd wziąć pieniądze</h2>
          {loading && !data && <Loading />}
          {data && active.length > 0 && (
            <>
              <p>Trwa nabór: <strong>{active[0].nabor.nazwa}</strong>{active.length > 1 ? ` i ${active.length - 1} inne` : ''}, do {formatDay(active[0].nabor.termin_do)}. Przygotujemy szkic wniosku na podstawie Twojej fiszki.</p>
              <Link to="/kreator/finansowanie" className="btn btn-primary">Znajdź finansowanie</Link>
            </>
          )}
          {data && active.length === 0 && (
            <>
              <p>
                Generator wniosków działa tylko w czasie naboru.{' '}
                {data.kolejny
                  ? `Najbliższy nabór („${data.kolejny.nazwa}”) startuje ${formatDay(data.kolejny.termin_od)}.`
                  : 'Nie ogłoszono jeszcze kolejnego naboru.'}
              </p>
              <Link to="/kreator/finansowanie" className="btn btn-secondary">Zobacz szczegóły</Link>
            </>
          )}
        </li>
        <li className="tile">
          <h2><LayoutGrid size={22} aria-hidden="true" /> Canva innowacji społecznych</h2>
          <p>Plansza do przemyślenia pomysłu: problem, osoby, rozwiązanie, koszty i pieniądze. Zapiszesz ją, wydrukujesz lub pobierzesz.</p>
          <Link to="/kreator/canva" className="btn btn-secondary">Wypełnij canvę</Link>
        </li>
      </ul>

      <section aria-labelledby="drafts-title" className="panel">
        <h2 id="drafts-title"><FileText size={22} aria-hidden="true" /> Twoje szkice</h2>
        {drafts.length === 0 ? (
          <p className="empty-state">Nie masz jeszcze zapisanych szkiców w tej przeglądarce. Szkice zapisują się same podczas pisania.</p>
        ) : (
          <ul className="plain-list">
            {drafts.map((d) => (
              <li key={`${d.typ}-${d.token}`}>
                <Link to={`${DRAFT_LINKS[d.typ].path}/${d.token}`}>{d.tytul || DRAFT_LINKS[d.typ].label}</Link>
                <span className="hint"> · {DRAFT_LINKS[d.typ].label} · zapisano {new Date(d.zapisano).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="hint">Lista jest zapisana tylko w tej przeglądarce. Sam szkic jest na serwerze i otwiera go link z adresu.</p>
      </section>
    </div>
  )
}
