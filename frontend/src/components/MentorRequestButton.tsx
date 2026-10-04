import { useState } from 'react'
import { errorText } from '@/admin/ui'
import { mentors } from '@/api/mentors'

/** „Poproś mentora” na stronie wątku: ROPS dostaje powiadomienie i sam dobiera mentora (ADR 0014). */
export default function MentorRequestButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function request() {
    setBusy(true)
    setError('')
    try {
      await mentors.requestMentor(token)
      setDone(true)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {!done && (
        <button type="button" data-tour="wspolpraca-mentor" className="btn btn-secondary" disabled={busy} onClick={request}>
          {busy ? 'Wysyłanie…' : 'Poproś mentora'}
        </button>
      )}
      <p role="status" className={done ? 'alert alert-note' : undefined}>
        {done ? 'Prośba trafiła do ROPS. Pracownik dobierze mentora do Twojej sprawy; jego odpowiedź pojawi się w tej rozmowie.' : ''}
      </p>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  )
}
