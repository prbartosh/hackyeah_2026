import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBox, Loading, useLoad } from '@/admin/ui'
import { mentors } from '@/api/mentors'
import { POWIATY, SEKTORY } from '@/api/partnerships'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { KATEGORIE } from '@/types/innowacja'
import '@/styles/admin.css'

/** Mentorzy (moduł V): publiczna lista, bez e-maili. Mentora do sprawy przydziela ROPS. */
export default function MentorsPage() {
  useDocumentTitle('Mentorzy · Splot')
  const [obszar, setObszar] = useState('')
  const [powiat, setPowiat] = useState('')
  const { data, error, loading, reload } = useLoad(() => mentors.list({ obszar, powiat }), [obszar, powiat])

  return (
    <div className="container page">
      <h1>Mentorzy</h1>
      <p className="lead">
        Doświadczone osoby i organizacje, które wspierają wdrażanie innowacji społecznych. Mentorzy pomagają
        w konkretnych sprawach zgłoszonych do ROPS Kraków.
      </p>
      <section className="panel" aria-labelledby="jak-h">
        <h2 id="jak-h">Jak poprosić o mentora</h2>
        <ol>
          <li>Wyślij zgłoszenie na stronie <Link to="/zglos">Zgłoś potrzebę</Link> i zachowaj link do swojej sprawy.</li>
          <li>Otwórz ten link i kliknij „Poproś mentora”.</li>
          <li>Pracownik ROPS dobierze mentora z listy. Jego odpowiedź zobaczysz w swojej rozmowie.</li>
        </ol>
        <p className="hint">Dane kontaktowe mentorów nie są publiczne: kontakt odbywa się przez ROPS.</p>
      </section>

      <div className="filters">
        <div className="field">
          <label htmlFor="m-obszar">Obszar</label>
          <select id="m-obszar" className="select" value={obszar} onChange={(e) => setObszar(e.target.value)}>
            <option value="">Wszystkie</option>
            {Object.entries(KATEGORIE).map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="m-powiat">Powiat</label>
          <select id="m-powiat" className="select" value={powiat} onChange={(e) => setPowiat(e.target.value)}>
            <option value="">Wszystkie</option>
            {POWIATY.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && data.length === 0 && <p>Brak mentorów dla wybranych filtrów.</p>}
      {data && data.length > 0 && (
        <ul className="plain-list" aria-label="Mentorzy">
          {data.map((m) => (
            <li key={m.id} className="panel">
              <p className="meta-line">
                <span className="tag">{SEKTORY[m.sektor]}</span>
                <span className="tag">Powiat: {m.powiat}</span>
                {m.syntetyczny && <span className="tag tag-synthetic">Przykładowy</span>}
              </p>
              <h2>{m.nazwa}</h2>
              <p><strong>{m.instytucja}</strong></p>
              <p>{m.opis}</p>
              {m.obszary.length > 0 && (
                <p className="hint">Obszary: {m.obszary.map((s) => KATEGORIE[s] ?? s).join(', ')}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
