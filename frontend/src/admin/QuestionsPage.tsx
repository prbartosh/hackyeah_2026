import { useState } from 'react'
import { pytania, type PytanieAdmin, type StatusPytania } from '@/api/pytania'
import { Empty, ErrorBox, Loading, Pagination, SyntheticTag, categoryName, errorText, formatDate, useLoad, useTitle } from '@/admin/ui'

const LIMIT = 25

const STATUS_LABELS: Record<StatusPytania, string> = {
  nowe: 'Nowe',
  odpowiedziane: 'Odpowiedziane',
  opublikowane: 'Opublikowane',
  ukryte: 'Ukryte',
}

function QuestionItem({ item, onChange }: { item: PytanieAdmin; onChange: (message: string) => void }) {
  const [text, setText] = useState(item.odpowiedz ?? '')
  const [question, setQuestion] = useState(item.tresc)
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>, message: string) {
    setFailure('')
    setBusy(true)
    try {
      await action()
      onChange(message)
    } catch (e) {
      setFailure(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const canPublish = item.zgoda_na_publikacje && !!item.odpowiedz && item.status !== 'opublikowane'
  return (
    <li className="panel">
      <p className="meta-line">
        <span className={`tag${item.status === 'nowe' ? ' tag-new' : ''}`}>{STATUS_LABELS[item.status]}</span>
        <span className="tag">{item.zgoda_na_publikacje ? 'Zgoda na publikację' : 'Bez zgody na publikację'}</span>
        {item.kategoria && <span className="tag">{categoryName(item.kategoria)}</span>}
        {item.syntetyczne && <SyntheticTag />}
        <span className="hint">{formatDate(item.created_at)}</span>
      </p>
      <h2>{item.tresc}</h2>
      <p className="hint">
        Autor: {item.autor_nazwa || 'anonimowo'}
        {item.autor_email ? ` · ${item.autor_email} (odpowiedź pójdzie na ten adres)` : ' · bez e-maila'}
      </p>
      <div className="field">
        <label htmlFor={`pyt-${item.id}`}>Treść pytania (popraw przed publikacją, np. usuń dane osobowe)</label>
        <textarea id={`pyt-${item.id}`} className="textarea" rows={3} maxLength={2000} value={question}
          onChange={(e) => setQuestion(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`odp-${item.id}`}>Odpowiedź ROPS</label>
        <textarea id={`odp-${item.id}`} className="textarea" rows={4} maxLength={6000} value={text}
          onChange={(e) => setText(e.target.value)} />
      </div>
      {failure && <p className="field-error" role="alert">{failure}</p>}
      <div className="btn-row">
        <button type="button" className="btn btn-primary" disabled={busy || text.trim().length < 5 || question.trim().length < 10}
          onClick={() => run(() => pytania.answer(item.id, text, question), 'Zapisano odpowiedź.')}>
          {item.odpowiedz ? 'Zapisz zmiany' : 'Odpowiedz'}
        </button>
        {canPublish && (
          <button type="button" className="btn btn-secondary" disabled={busy}
            onClick={() => run(() => pytania.publish(item.id), 'Opublikowano pytanie.')}>Opublikuj</button>
        )}
        {item.status !== 'ukryte' && (
          <button type="button" className="btn btn-secondary" disabled={busy}
            onClick={() => run(() => pytania.hide(item.id), 'Ukryto pytanie.')}>Ukryj</button>
        )}
      </div>
    </li>
  )
}

/** Pytania do ROPS: odpowiedź, publikacja (tylko za zgodą autora) i ukrywanie. */
export default function QuestionsPage() {
  useTitle('Pytania')
  const [status, setStatus] = useState<StatusPytania | ''>('nowe')
  const [offset, setOffset] = useState(0)
  const { data, error, loading, reload } = useLoad(() => pytania.adminList(status, offset), [status, offset])
  const [done, setDone] = useState('')

  return (
    <>
      <h1>Pytania do ROPS</h1>
      <p className="lead">
        Pytania zadane na stronie publicznej. Po odpowiedzi możesz je opublikować w FAQ, ale tylko gdy autor się
        zgodził. Adres e-mail autora widzisz tylko tutaj.
      </p>
      <div className="filters">
        <div className="field">
          <label htmlFor="pyt-status">Pokaż</label>
          <select id="pyt-status" className="select" value={status}
            onChange={(e) => { setStatus(e.target.value as StatusPytania | ''); setOffset(0) }}>
            <option value="nowe">Nowe</option>
            <option value="odpowiedziane">Odpowiedziane</option>
            <option value="opublikowane">Opublikowane</option>
            <option value="ukryte">Ukryte</option>
            <option value="">Wszystkie</option>
          </select>
        </div>
      </div>
      <p role="status" className="hint">{done}</p>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && data.items.length === 0 && <Empty>Brak pytań w tym widoku.</Empty>}
      {data && data.items.length > 0 && (
        <ul className="plain-list">
          {data.items.map((item) => (
            <QuestionItem key={`${item.id}-${item.status}-${item.odpowiedziano}`} item={item}
              onChange={(message) => { setDone(message); reload() }} />
          ))}
        </ul>
      )}
      {data && <Pagination offset={offset} limit={LIMIT} total={data.total} onChange={setOffset} />}
    </>
  )
}
