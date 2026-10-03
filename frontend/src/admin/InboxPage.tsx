import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '@/admin/api'
import {
  Empty, ErrorBox, Pagination, SlaBadge, StatusBadge, StatusLine, SyntheticTag, TableSkeleton, UrgencyBadge,
  categoryName, errorText, formatDate, useLoad, useTitle,
} from '@/admin/ui'
import type { PanelSettings } from '@/admin/types'
import { KATEGORIE } from '@/types/innowacja'

const LIMIT = 20

function SettingsBox() {
  const { data, error, reload } = useLoad(() => api.settings(), [])
  const [message, setMessage] = useState('')
  const [fail, setFail] = useState('')

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const body: Partial<PanelSettings> = {
      sla_godziny: Number(form.get('sla')),
      prog_duplikatow: Number(form.get('dup')) / 100,
      prog_dopasowania: Number(form.get('match')) / 100,
    }
    setMessage('')
    setFail('')
    try {
      await api.saveSettings(body)
      // Bez ponownego wczytania: formularz się nie przebudowuje, więc fokus zostaje na przycisku.
      setMessage('Zapisano ustawienia.')
    } catch (err) {
      setFail(errorText(err))
    }
  }

  return (
    <details className="settings-box">
      <summary>Ustawienia skrzynki (cel czasu odpowiedzi, progi podobieństwa)</summary>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <form onSubmit={save} className="stack" key={JSON.stringify(data)}>
          <div className="grid-fields">
            <div className="field">
              <label htmlFor="set-sla">Cel czasu odpowiedzi (godziny)</label>
              <input id="set-sla" name="sla" className="input" type="number" min="1" defaultValue={data.sla_godziny} />
            </div>
            <div className="field">
              <label htmlFor="set-dup">Próg duplikatu (podobieństwo, %)</label>
              <input id="set-dup" name="dup" className="input" type="number" min="1" max="100" defaultValue={Math.round(data.prog_duplikatow * 100)} aria-describedby="set-dup-hint" />
              <p id="set-dup-hint" className="hint">Zgłoszenia podobne w co najmniej tym stopniu są pokazywane jako możliwe duplikaty.</p>
            </div>
            <div className="field">
              <label htmlFor="set-match">Próg dopasowania do bazy (%)</label>
              <input id="set-match" name="match" className="input" type="number" min="1" max="100" defaultValue={Math.round(data.prog_dopasowania * 100)} aria-describedby="set-match-hint" />
              <p id="set-match-hint" className="hint">Zgłoszenia poniżej tego progu trafiają do radaru trendów jako „bez dopasowania”.</p>
            </div>
          </div>
          <p className="hint">
            {data.ai_dostepne
              ? `Podpowiedzi AI są włączone (model embeddingów: ${data.model_embeddingow}).`
              : 'Podpowiedzi AI są wyłączone (brak klucza API). Triaż działa w uproszczonym trybie.'}
          </p>
          <div className="btn-row"><button type="submit" className="btn btn-secondary">Zapisz ustawienia</button></div>
        </form>
      )}
      <StatusLine message={message} error={fail} />
    </details>
  )
}

export default function InboxPage() {
  useTitle('Skrzynka zgłoszeń')
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const pilnosc = params.get('pilnosc') ?? ''
  const kategoria = params.get('kategoria') ?? ''
  const q = params.get('q') ?? ''
  const sort = params.get('sort') ?? 'pilnosc'
  const offset = Number(params.get('offset') ?? 0)

  const { data, error, loading, reload } = useLoad(
    () => api.tickets({ status, pilnosc, kategoria, q, sort, offset, limit: LIMIT }),
    [status, pilnosc, kategoria, q, sort, offset],
  )

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('offset' in changes)) next.delete('offset')
    setParams(next, { replace: true })
  }

  const hasFilters = Boolean(status || pilnosc || kategoria || q)

  return (
    <>
      <h1>Skrzynka zgłoszeń</h1>
      <p className="lead">Zgłoszenia od użytkowników. Najpilniejsze i najdłużej czekające są na górze.</p>

      <form className="filters" role="search" aria-label="Filtry zgłoszeń" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="f-q">Szukaj w treści</label>
          <input id="f-q" className="input" type="search" defaultValue={q} key={q}
            onKeyDown={(e) => { if (e.key === 'Enter') update({ q: e.currentTarget.value.trim() }) }}
            onBlur={(e) => { if (e.currentTarget.value.trim() !== q) update({ q: e.currentTarget.value.trim() }) }} />
        </div>
        <div className="field">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" className="select" value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">Wszystkie</option>
            <option value="nowe">Nowe</option>
            <option value="w_trakcie">W trakcie</option>
            <option value="odpowiedziane">Odpowiedziane</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-pilnosc">Pilność</label>
          <select id="f-pilnosc" className="select" value={pilnosc} onChange={(e) => update({ pilnosc: e.target.value })}>
            <option value="">Wszystkie</option>
            <option value="wysoka">Wysoka</option>
            <option value="srednia">Średnia</option>
            <option value="niska">Niska</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-kat">Obszar</label>
          <select id="f-kat" className="select" value={kategoria} onChange={(e) => update({ kategoria: e.target.value })}>
            <option value="">Wszystkie</option>
            {Object.entries(KATEGORIE).map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-sort">Kolejność</label>
          <select id="f-sort" className="select" value={sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="pilnosc">Najpilniejsze najpierw</option>
            <option value="czas">Najdłużej czekające najpierw</option>
            <option value="najnowsze">Najnowsze najpierw</option>
          </select>
        </div>
        {hasFilters && (
          <div className="field field-end">
            <button type="button" className="btn btn-ghost" onClick={() => setParams({}, { replace: true })}>Wyczyść filtry</button>
          </div>
        )}
      </form>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <TableSkeleton label="Wczytywanie zgłoszeń…" />}
      {data && data.items.length === 0 && (
        <Empty>{hasFilters ? 'Żadne zgłoszenie nie pasuje do filtrów.' : 'Skrzynka jest pusta. Nowe zgłoszenia pojawią się tutaj.'}</Empty>
      )}
      {data && data.items.length > 0 && (
        <div className={`table-wrap${loading ? ' is-stale' : ''}`} tabIndex={0} role="region" aria-label="Tabela zgłoszeń" aria-busy={loading || undefined}>
          <table className="admin-table">
            <caption className="visually-hidden">Zgłoszenia od użytkowników, {data.total} łącznie</caption>
            <thead>
              <tr>
                <th scope="col">Zgłoszenie</th>
                <th scope="col">Status</th>
                <th scope="col">Pilność</th>
                <th scope="col">Obszar</th>
                <th scope="col">Czas odpowiedzi</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <th scope="row" className="cell-main">
                    <Link to={`/admin/zgloszenia/${t.id}`} state={{ from: params.toString() }}>Nr {t.id}: {t.skrot}</Link>
                    <div className="hint">
                      Wpłynęło {formatDate(t.created_at)}
                      {t.syntetyczne && <> <SyntheticTag /></>}
                      {t.liczba_duplikatow > 0 && <> · możliwe duplikaty: {t.liczba_duplikatow}</>}
                      {!t.triaz_wykonany && <> · czeka na analizę</>}
                    </div>
                  </th>
                  <td><StatusBadge status={t.status} /></td>
                  <td><UrgencyBadge urgency={t.pilnosc} /></td>
                  <td>{categoryName(t.kategoria)}</td>
                  <td><SlaBadge sla={t.sla} answered={t.status === 'odpowiedziane'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination offset={offset} limit={LIMIT} total={data.total} onChange={(o) => update({ offset: String(o) })} />}
      <SettingsBox />
    </>
  )
}
