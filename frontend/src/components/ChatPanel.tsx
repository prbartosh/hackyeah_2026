import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, Pencil, RotateCcw } from 'lucide-react'
import { useChat, type DisplayMessage } from '@/context/ChatContext'
import { MAX_MESSAGE_CHARS, MAX_USER_MESSAGE_CHARS, ROLE_LABELS, type Question, type Role } from '@/types/chat'
import VoiceButton from '@/components/VoiceButton'

// Krótkie podpowiedzi; kliknięcie wysyła pełny opis (scenariusze z user_scenario.md i docs/DEMO.md)
const EXAMPLES = [
  {
    label: 'Samotni seniorzy',
    text: 'Jestem wójtem. W naszej gminie wielu seniorów mieszka samotnie i rzadko wychodzi z domu.',
  },
  {
    label: 'Mama z demencją',
    text: 'Mama ma początki demencji. Zapomina, czy brała leki i gdzie są klucze. Nie mogę być przy niej cały dzień.',
  },
  {
    label: 'Wnioski dla Głuchych',
    text: 'Prowadzimy fundację. Szukamy sposobu, żeby osoby Głuche mogły samodzielnie wypełniać wnioski w urzędzie.',
  },
  {
    label: 'Zakupy z wózkiem',
    text: 'Nie mogę zrobić zakupów z synem, który porusza się na wózku. Zawsze muszę prosić kogoś o pomoc.',
  },
]

function RoleBar() {
  const { state, changeRole, streaming } = useChat()
  const [editing, setEditing] = useState(false)
  const role = state.rola
  if (!role) return <div />

  return (
    <div className="role-bar">
      <p className="role-pill">
        Piszesz jako: <strong>{ROLE_LABELS[role]}</strong>
      </p>
      {!editing ? (
        <button type="button" className="btn btn-link" onClick={() => setEditing(true)} aria-expanded={false}>
          Zmień
        </button>
      ) : (
        <fieldset className="role-picker">
          <legend>Kim jesteś?</legend>
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
  const { sendMessage, streaming } = useChat()
  const [other, setOther] = useState(false)
  const [otherText, setOtherText] = useState('')
  const inputId = useId()

  const submitOther = (e: FormEvent) => {
    e.preventDefault()
    if (otherText.trim()) sendMessage(otherText.trim())
  }

  return (
    <div className="question" role="group" aria-label={question.text}>
      <div className="option-list">
        {question.options.map((opt) => (
          <button key={opt} type="button" className="btn btn-option" disabled={streaming} onClick={() => sendMessage(opt)}>
            {opt}
          </button>
        ))}
        <button type="button" className="btn btn-option" aria-expanded={other} onClick={() => setOther((v) => !v)}>
          <Pencil size={16} aria-hidden="true" />
          Inne
        </button>
      </div>
      {other && (
        <form className="other-form" onSubmit={submitOther}>
          <label htmlFor={inputId} className="visually-hidden">Twoja odpowiedź</label>
          <div className="other-row">
            <input
              id={inputId}
              className="input"
              value={otherText}
              placeholder="Wpisz swoją odpowiedź"
              maxLength={MAX_USER_MESSAGE_CHARS}
              onChange={(e) => setOtherText(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={streaming}>
              Wyślij<span className="visually-hidden"> odpowiedź</span>
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function SummaryBlock({ text, pending, confirmed }: { text: string; pending: boolean; confirmed: boolean }) {
  const { confirmSummary, streaming } = useChat()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const id = useId()

  return (
    <div className="summary-block" role="group" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Twój problem w skrócie</h2>
      {editing && pending ? (
        <>
          <label htmlFor={id} className="visually-hidden">Popraw podsumowanie</label>
          <textarea
            id={id}
            className="textarea"
            rows={5}
            maxLength={MAX_MESSAGE_CHARS - 40}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </>
      ) : (
        <p>{text}</p>
      )}

      {pending && (
        <div className="btn-row">
          {editing ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                disabled={streaming || !draft.trim()}
                onClick={() => confirmSummary(draft.trim())}
              >
                Zatwierdź poprawione
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                Anuluj
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-primary" disabled={streaming} onClick={() => confirmSummary()}>
                Potwierdzam
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
                Popraw
              </button>
            </>
          )}
        </div>
      )}
      {!pending && confirmed && <p className="status-ok">Zatwierdzone</p>}
    </div>
  )
}

function Avatar() {
  return (
    <span className="msg-avatar" aria-hidden="true">
      <svg viewBox="0 0 40 40" width="18" height="18" fill="none">
        <path d="M6 14c8 0 8 12 14 12s8-12 14-12M6 26c8 0 8-12 14-12s8 12 14 12" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function MessageItem({ message, isLast, lastSummaryId }: { message: DisplayMessage; isLast: boolean; lastSummaryId: number | null }) {
  const { awaiting, summaryConfirmed } = useChat()

  if (message.from === 'user') {
    return (
      <li className="msg msg-user">
        <p className="msg-text">
          <span className="visually-hidden">Ty: </span>
          {message.text}
        </p>
      </li>
    )
  }

  return (
    <li className="msg msg-assistant">
      <Avatar />
      <div className="msg-content">
        {message.text && (
          <p className="msg-text">
            <span className="visually-hidden">Splot: </span>
            {message.text}
          </p>
        )}
        {message.question && (
          <>
            <p className="msg-text msg-question">{message.question.text}</p>
            {isLast && awaiting === 'question' && <QuestionOptions question={message.question} />}
          </>
        )}
        {message.summary && (
          <SummaryBlock
            text={message.summary}
            pending={isLast && awaiting === 'summary'}
            confirmed={summaryConfirmed && message.id === lastSummaryId}
          />
        )}
      </div>
    </li>
  )
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Element znika łagodnie: jego kopia blaknie w tym samym miejscu, a prawdziwy może od razu zniknąć z układu. */
function fadeOutGhost(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return
  const r = el.getBoundingClientRect()
  const ghost = el.cloneNode(true) as HTMLElement
  ghost.removeAttribute('id')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.inert = true
  Object.assign(ghost.style, {
    position: 'fixed', top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`,
    margin: '0', pointerEvents: 'none', zIndex: '50', animation: 'none',
  })
  document.body.appendChild(ghost)
  const anim = ghost.animate(
    [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-14px)' }],
    { duration: 150, easing: 'ease-out', fill: 'forwards' },
  )
  anim.finished.then(() => ghost.remove(), () => ghost.remove())
}

export default function ChatPanel() {
  const { display, streaming, status, sendMessage, showResultsNow, error, retry, results, reset } = useChat()
  const [draft, setDraft] = useState('')
  const [showError, setShowError] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLFormElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const chipsRef = useRef<HTMLUListElement>(null)
  const flipFrom = useRef<DOMRect | null>(null)
  const started = display.length > 0
  const lastSummaryId = [...display].reverse().find((m) => m.summary)?.id ?? null

  // Przejście ekran startowy ↔ rozmowa (jak w Gemini): pole pisania płynnie zjeżdża na dół (FLIP: zapamiętujemy
  // pozycję przed zmianą, a po zmianie animujemy różnicę); powitanie i podpowiedzi blakną.
  const rememberComposer = () => {
    const box = dockRef.current?.querySelector('.composer-box')
    flipFrom.current = box ? box.getBoundingClientRect() : null
  }
  useLayoutEffect(() => {
    const from = flipFrom.current
    flipFrom.current = null
    const box = dockRef.current?.querySelector('.composer-box')
    if (!from || !box || prefersReducedMotion()) return
    const to = box.getBoundingClientRect()
    const dx = from.left - to.left
    const dy = from.top - to.top
    if (!dx && !dy) return
    box.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
      { duration: 520, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    )
  }, [started])

  const send = (text: string) => {
    if (!started) {
      rememberComposer()
      fadeOutGhost(titleRef.current)
      fadeOutGhost(chipsRef.current)
    }
    sendMessage(text)
  }
  const startOver = () => {
    rememberComposer()
    reset()
    setDraft('')
  }

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }, [draft, started])

  // Pole pisania jest przyklejone do dołu — przewijając do końca rozmowy, zostaw miejsce na jego wysokość
  useEffect(() => {
    const dock = dockRef.current
    const end = endRef.current
    if (!dock || !end) return
    const apply = () => { end.style.scrollMarginBottom = `${dock.offsetHeight + 16}px` }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(dock)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!display.length) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Przyklejone pole: przewiń do końca rozmowy; nieprzyklejone (telefon + duży tekst): do końca pola
    const sticky = dockRef.current && getComputedStyle(dockRef.current).position === 'sticky'
    const target = sticky ? endRef.current : dockRef.current
    target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' })
  }, [display])

  const submit = () => {
    if (streaming) return
    if (!draft.trim()) {
      setShowError(true)
      textareaRef.current?.focus()
      return
    }
    setShowError(false)
    send(draft.trim())
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <section className={`chat${started ? '' : ' is-empty'}`} aria-labelledby="chat-title">
      <h1 ref={titleRef} id="chat-title" className={started ? 'visually-hidden' : 'chat-title'}>
        Opisz problem, znajdź rozwiązanie
      </h1>

      {started && (
        <div className="chat-toolbar">
          <RoleBar />
          <button type="button" className="btn btn-link" onClick={startOver}>
            <RotateCcw size={16} aria-hidden="true" />
            Nowa rozmowa
          </button>
        </div>
      )}

      <ol className="chat-log" aria-live="polite" aria-relevant="additions text" aria-busy={streaming}>
        {display.map((m, i) => (
          <MessageItem key={m.id} message={m} isLast={i === display.length - 1} lastSummaryId={lastSummaryId} />
        ))}
        {streaming && (
          <li className="msg msg-assistant msg-typing">
            <Avatar />
            <div className="msg-content">
              <p className="typing-row" aria-hidden="true">
                <span className="typing"><span /><span /><span /></span>
                <span className="typing-status">{status ?? 'Splot pisze…'}</span>
              </p>
            </div>
          </li>
        )}
      </ol>
      {/* Poza listą: `aria-busy` na liście wycisza ją dla czytnika do końca tury */}
      <p className="visually-hidden" role="status">
        {streaming ? (status ?? 'Splot pisze…') : ''}
      </p>
      <div ref={endRef} className="chat-end" aria-hidden="true" />

      {error && (
        <div className="alert alert-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={retry}>
            Spróbuj ponownie
          </button>
        </div>
      )}

      <form ref={dockRef} className="composer-dock" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <label htmlFor="chat-input" className="visually-hidden">
          {started ? 'Twoja wiadomość' : 'Opisz swój problem'}
        </label>
        <p id="chat-hint" className="visually-hidden">
          Enter wysyła wiadomość, Shift+Enter dodaje nową linię.
        </p>
        <div className="composer-box">
          <textarea
            ref={textareaRef}
            id="chat-input"
            className="composer-input"
            rows={1}
            maxLength={MAX_USER_MESSAGE_CHARS}
            value={draft}
            placeholder={started ? 'Napisz odpowiedź…' : 'Np. mama zapomina o lekach, a nie mogę być przy niej cały dzień'}
            onChange={(e) => { setDraft(e.target.value); if (showError) setShowError(false) }}
            onKeyDown={onKeyDown}
            aria-describedby={showError ? 'chat-hint chat-error' : 'chat-hint'}
            aria-invalid={showError}
          />
          <div className="composer-actions">
            <VoiceButton onText={(t) => setDraft((d) => (d ? `${d} ${t}` : t))} />
            <span className="composer-spacer" />
            {started && (
              <button type="button" className="btn btn-ghost" onClick={showResultsNow} aria-disabled={streaming}>
                {results ? 'Odśwież wyniki' : 'Pokaż wyniki teraz'}
              </button>
            )}
            <button type="submit" className="btn btn-primary" aria-disabled={streaming}>
              Wyślij
              <ArrowUp size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        {showError && (
          <p id="chat-error" className="field-error" role="alert">
            Wpisz kilka słów, żeby wysłać.
          </p>
        )}
      </form>

      {!started && (
        <ul ref={chipsRef} className="chips" aria-label="Przykłady do wypróbowania">
          {EXAMPLES.map((ex) => (
            <li key={ex.label}>
              <button type="button" className="chip" onClick={() => send(ex.text)}>
                {ex.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
