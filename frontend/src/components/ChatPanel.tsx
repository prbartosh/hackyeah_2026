import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useChat, type Message } from '@/context/ChatContext'
import { ROLE_LABELS, type Question, type Role } from '@/types/chat'
import VoiceButton from '@/components/VoiceButton'

// Przykładowe opisy oparte na scenariuszach z user_scenario.md i docs/DEMO.md
const EXAMPLES = [
  'Jestem wójtem. W naszej gminie wielu seniorów mieszka samotnie i rzadko wychodzi z domu.',
  'Mama ma początki demencji. Zapomina, czy brała leki i gdzie są klucze. Nie mogę być przy niej cały dzień.',
  'Prowadzimy fundację. Szukamy sposobu, żeby osoby Głuche mogły samodzielnie wypełniać wnioski w urzędzie.',
  'Nie mogę zrobić zakupów z synem, który porusza się na wózku. Zawsze muszę prosić kogoś o pomoc.',
]

function RoleBar() {
  const { role, changeRole, streaming } = useChat()
  const [editing, setEditing] = useState(false)
  const groupId = useId()
  if (!role) return null

  return (
    <div className="role-bar">
      <p className="role-current">
        Piszesz jako: <strong>{ROLE_LABELS[role]}</strong>
      </p>
      {!editing ? (
        <button type="button" className="btn btn-link" onClick={() => setEditing(true)} aria-expanded={false}>
          Zmień
        </button>
      ) : (
        <fieldset className="role-picker" aria-describedby={groupId}>
          <legend>Wybierz, kim jesteś</legend>
          <p id={groupId} className="hint">Od tego zależą pytania i kolejność wyników.</p>
          <div className="option-list">
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                className="btn btn-option"
                aria-pressed={r === role}
                disabled={streaming}
                onClick={() => {
                  setEditing(false)
                  if (r !== role) changeRole(r)
                }}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}

function QuestionOptions({ question }: { question: Question }) {
  const { answerQuestion, streaming } = useChat()
  const [other, setOther] = useState(false)
  const [otherText, setOtherText] = useState('')
  const inputId = useId()

  const submitOther = (e: FormEvent) => {
    e.preventDefault()
    if (otherText.trim()) answerQuestion(otherText.trim())
  }

  return (
    <div className="question" role="group" aria-label={question.text}>
      <div className="option-list">
        {question.options.map((opt) => (
          <button key={opt} type="button" className="btn btn-option" disabled={streaming} onClick={() => answerQuestion(opt)}>
            {opt}
          </button>
        ))}
        <button type="button" className="btn btn-option" aria-expanded={other} onClick={() => setOther((v) => !v)}>
          Inne — wpiszę sam(a)
        </button>
      </div>
      {other && (
        <form className="other-form" onSubmit={submitOther}>
          <label htmlFor={inputId}>Twoja odpowiedź</label>
          <div className="other-row">
            <input id={inputId} className="input" value={otherText} onChange={(e) => setOtherText(e.target.value)} autoFocus />
            <button type="submit" className="btn btn-primary">Wyślij odpowiedź</button>
          </div>
        </form>
      )}
    </div>
  )
}

function SummaryBlock({ text }: { text: string }) {
  const { confirmSummary, summary, streaming } = useChat()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const inputId = useId()
  const confirmed = summary?.status === 'confirmed'

  return (
    <section className="summary-block" aria-labelledby={`${inputId}-title`}>
      <h3 id={`${inputId}-title`}>Podsumowanie Twojego problemu</h3>
      {!editing ? (
        <p>{confirmed ? summary.text : text}</p>
      ) : (
        <>
          <label htmlFor={inputId}>Popraw podsumowanie</label>
          <textarea id={inputId} className="textarea" rows={5} value={draft} onChange={(e) => setDraft(e.target.value)} />
        </>
      )}
      {confirmed ? (
        <p className="status-ok">Podsumowanie zatwierdzone.</p>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn btn-primary" disabled={streaming} onClick={() => confirmSummary(editing ? draft : text)}>
            {editing ? 'Zapisz i szukaj' : 'Tak, zgadza się — szukaj rozwiązań'}
          </button>
          {!editing && (
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
              Chcę poprawić
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function MessageItem({ message, isLast }: { message: Message; isLast: boolean }) {
  const { pendingQuestion } = useChat()
  const isUser = message.from === 'user'
  return (
    <li className={`msg ${isUser ? 'msg-user' : 'msg-assistant'}`}>
      <p className="msg-author">{isUser ? 'Ty' : 'Splot'}</p>
      {message.text && <p className="msg-text">{message.text}</p>}
      {message.question && isLast && pendingQuestion?.id === message.question.id && (
        <QuestionOptions question={message.question} />
      )}
      {message.summary && <SummaryBlock text={message.summary} />}
    </li>
  )
}

export default function ChatPanel() {
  const { messages, streaming, sendMessage, showResultsNow, demoMode, error, results, reset } = useChat()
  const [draft, setDraft] = useState('')
  const [showError, setShowError] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const started = messages.length > 0


  const submit = () => {
    if (streaming) return
    if (!draft.trim()) {
      setShowError(true)
      textareaRef.current?.focus()
      return
    }
    setShowError(false)
    sendMessage(draft.trim())
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <section className="chat" aria-labelledby="chat-title">
      <div className="chat-head">
        <h2 id="chat-title">Rozmowa</h2>
        {started && (
          <button type="button" className="btn btn-link" onClick={() => { reset(); setDraft('') }}>
            Zacznij od nowa
          </button>
        )}
      </div>

      <RoleBar />

      <ol className="chat-log" aria-live="polite" aria-relevant="additions text" aria-busy={streaming}>
        <li className="msg msg-assistant">
          <p className="msg-author">Splot</p>
          <p className="msg-text">
            Dzień dobry. Opisz własnymi słowami, z jakim problemem się mierzysz — swoim, bliskiej osoby
            albo mieszkańców gminy. Zadam najwyżej kilka pytań i pokażę sprawdzone rozwiązania.
          </p>
        </li>
        {messages.map((m, i) => (
          <MessageItem key={m.id} message={m} isLast={i === messages.length - 1} />
        ))}
        {streaming && messages[messages.length - 1]?.from === 'user' && (
          <li className="msg msg-assistant msg-typing">
            <p className="msg-author">Splot</p>
            <p className="msg-text">Analizuję Twoją wiadomość…</p>
          </li>
        )}
      </ol>

      {error && <p className="alert alert-error" role="alert">{error}</p>}

      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <label htmlFor="chat-input" className="chat-label">
          {started ? 'Twoja wiadomość' : 'Opisz swój problem'}
        </label>
        <p id="chat-hint" className="hint">
          Nie musisz znać nazw ani przepisów. Enter wysyła, Shift+Enter dodaje nową linię.
        </p>
        <textarea
          ref={textareaRef}
          id="chat-input"
          className="textarea"
          rows={started ? 2 : 4}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); if (showError) setShowError(false) }}
          onKeyDown={onKeyDown}
          aria-describedby={showError ? 'chat-hint chat-error' : 'chat-hint'}
          aria-invalid={showError}
        />
        {showError && (
          <p id="chat-error" className="field-error" role="alert">
            Wpisz kilka słów albo wybierz jeden z przykładów.
          </p>
        )}
        <div className="chat-actions">
          <VoiceButton onText={(t) => setDraft((d) => (d ? `${d} ${t}` : t))} />
          <button type="submit" className="btn btn-primary" aria-disabled={streaming}>
            Wyślij
          </button>
          {started && (
            <button
              type="button"
              className="btn btn-secondary chat-results-now"
              onClick={showResultsNow}
              aria-disabled={streaming}
            >
              {results ? 'Odśwież wyniki' : 'Pokaż wyniki teraz'}
            </button>
          )}
        </div>
      </form>

      {!started && (
        <div className="examples">
          <h3 id="examples-title">Przykładowe opisy — kliknij, aby wysłać</h3>
          <ul className="example-list" aria-labelledby="examples-title">
            {EXAMPLES.map((ex) => (
              <li key={ex}>
                <button type="button" className="example" onClick={() => sendMessage(ex)}>
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {demoMode && (
        <p className="demo-note">
          Tryb demonstracyjny: serwer czatu jest jeszcze niedostępny, odpowiedzi generuje uproszczony
          mechanizm w przeglądarce na podstawie bazy innowacji ROPS Kraków.
        </p>
      )}
    </section>
  )
}
