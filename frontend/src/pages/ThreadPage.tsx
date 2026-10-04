import { Link, useParams } from 'react-router-dom'
import { api } from '@/admin/api'
import MentorRequestButton from '@/components/MentorRequestButton'
import { ErrorBox, Loading, formatDate, useLoad } from '@/admin/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import '@/styles/admin.css'

/** Publiczny widok rozmowy: autor zgłoszenia widzi swoje zgłoszenie i odpowiedź ROPS. */
export default function ThreadPage() {
  const { token = '' } = useParams()
  useDocumentTitle('Twoje zgłoszenie · Splot')
  const { data, error, loading, reload } = useLoad(() => api.publicThread(token), [token])

  return (
    <div className="container page">
      <h1>Twoje zgłoszenie</h1>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <p>
            {data.status === 'odpowiedziane'
              ? 'Zespół ROPS odpowiedział na zgłoszenie.'
              : 'Zgłoszenie czeka na odpowiedź zespołu ROPS. Wróć na tę stronę później.'}
          </p>
          <ol className="thread">
            {data.wiadomosci.map((m, i) => (
              <li key={i} className={m.autor_rola === 'admin' ? 'msg-admin' : 'msg-author'}>
                <p className="hint">{m.autor_rola === 'admin' ? 'Odpowiedź ROPS' : 'Twoje zgłoszenie'} · {formatDate(m.created_at)}</p>
                <p className="pre">{m.tresc}</p>
                {m.zrodla && m.zrodla.length > 0 && (
                  <p className="hint">
                    Rozwiązania z bazy: {m.zrodla.map((s, j) => (
                      <span key={s.slug}>{j > 0 && ', '}<Link to={`/innowacja/${s.slug}`}>{s.nazwa}</Link></span>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ol>
          <MentorRequestButton token={token} />
        </>
      )}
    </div>
  )
}
