import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarDays, ExternalLink } from 'lucide-react'
import { ErrorBox, Loading, errorText, useLoad } from '@/admin/ui'
import { kreator } from '@/kreator/api'
import { formatDay } from '@/kreator/helpers'
import type { NaborDopasowany } from '@/kreator/types'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

/** „Znajdź finansowanie”: aktywne nabory dopasowane do fiszki albo karty innowacji, z uzasadnieniem. */
export default function FinansowaniePage() {
  useDocumentTitle('Znajdź finansowanie · Kreator pomysłów · Splot')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const fiszka = params.get('fiszka') ?? undefined
  const karta = params.get('karta') ?? undefined
  const { data, error, loading, reload } = useLoad(() => kreator.nabory({ fiszka, karta }), [fiszka, karta])
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [fromCard, setFromCard] = useState<string | null>(null)

  async function prepare(slug: string) {
    setBusy(slug)
    setActionError('')
    try {
      let token = fiszka ?? fromCard
      if (!token && karta) {
        // Z karty innowacji: fiszka powstaje z jej danych, bez przepisywania
        token = (await kreator.fiszkaZKarty(karta)).token
        setFromCard(token)
      }
      if (!token) return
      const wniosek = await kreator.createWniosek(token, slug)
      navigate(`/kreator/wniosek/${wniosek.token}`)
    } catch (e) {
      setActionError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  const needsIdea = !fiszka && !karta
  return (
    <div className="container page kreator">
      <nav aria-label="Ścieżka nawigacji" className="breadcrumbs">
        <ol>
          <li><Link to="/kreator">Kreator pomysłów</Link></li>
          <li aria-current="page">Znajdź finansowanie</li>
        </ol>
      </nav>
      <h1>Skąd wziąć pieniądze</h1>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {actionError && <ErrorBox message={actionError} />}

      {data && data.aktywne.length > 0 && (
        <>
          <p className="lead">Te nabory trwają teraz. {needsIdea ? 'Najpierw opisz pomysł w fiszce, wtedy przygotujemy szkic wniosku.' : 'Wybierz nabór, a przygotujemy szkic wniosku z Twoich danych.'}</p>
          <ul className="plain-list">
            {data.aktywne.map((a) => (
              <NaborCard key={a.nabor.slug} item={a} busy={busy === a.nabor.slug} canPrepare={!needsIdea} onPrepare={() => prepare(a.nabor.slug)} />
            ))}
          </ul>
          {needsIdea && <p><Link to="/kreator/fiszka" className="btn btn-primary">Opisz pomysł</Link></p>}
        </>
      )}

      {data && data.aktywne.length === 0 && (
        <div className="panel" role="status">
          <h2><CalendarDays size={22} aria-hidden="true" /> Teraz nie trwa żaden nabór</h2>
          <p>
            {data.kolejny
              ? <>Najbliższy nabór: <strong>{data.kolejny.nazwa}</strong>, od {formatDay(data.kolejny.termin_od)} do {formatDay(data.kolejny.termin_do)}. Generator wniosków włączy się wtedy automatycznie.</>
              : 'Nie ogłoszono jeszcze kolejnego naboru. Zajrzyj tu później.'}
          </p>
          {data.ostatni_zakonczony && (
            <p className="hint">Ostatni nabór („{data.ostatni_zakonczony.nazwa}”) zakończył się {formatDay(data.ostatni_zakonczony.termin_do)}.</p>
          )}
          <p>W międzyczasie możesz dopracować pomysł: <Link to={fiszka ? `/kreator/fiszka/${fiszka}` : '/kreator/fiszka'}>fiszka pomysłu</Link> albo <Link to={fiszka ? `/kreator/canva?fiszka=${fiszka}` : '/kreator/canva'}>canva innowacji</Link>.</p>
        </div>
      )}
    </div>
  )
}

function NaborCard({ item, busy, canPrepare, onPrepare }: { item: NaborDopasowany; busy: boolean; canPrepare: boolean; onPrepare: () => void }) {
  const { nabor, dopasowanie } = item
  const titleId = `nabor-${nabor.slug}`
  return (
    <li className="panel" aria-labelledby={titleId}>
      <h2 id={titleId}>{nabor.nazwa}</h2>
      <p className="meta-line">
        <span className={dopasowanie.pasuje ? 'tag tag-ontime' : 'tag'}>{dopasowanie.pasuje ? 'Pasuje do Twojego pomysłu' : 'Dopasowanie niepewne'}</span>
        <span>Termin: do {formatDay(nabor.termin_do)}</span>
      </p>
      <p>{dopasowanie.powod}</p>
      {nabor.opis && <p className="hint">{nabor.opis}</p>}
      <p className="hint">
        Źródło: {nabor.organizator ?? 'organizator naboru'}
        {nabor.url_zrodlowy && (
          <> · <a href={nabor.url_zrodlowy} target="_blank" rel="noreferrer">strona naboru<span className="visually-hidden"> (otwiera się w nowej karcie)</span> <ExternalLink size={14} aria-hidden="true" /></a></>
        )}
        {nabor.syntetyczny && <> · <span className="tag tag-synthetic">Dane demo</span></>}
      </p>
      {canPrepare && (
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={onPrepare} disabled={busy}>
            {busy ? 'Przygotowywanie…' : 'Przygotuj szkic wniosku'}
          </button>
        </div>
      )}
    </li>
  )
}
