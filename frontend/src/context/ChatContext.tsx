import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { ChatError, streamChat } from '@/api/chat'
import {
  ACTION_HISTORY_TEXT,
  INITIAL_STATE,
  MAX_MESSAGES,
  MAX_MESSAGE_CHARS,
  PROBLEM_FIELDS,
  type ApiMessage,
  type ChatAction,
  type ChatState,
  type ProblemFields,
  type ProblemKey,
  type Question,
  type Results,
  type Role,
  type ServerEvent,
} from '@/types/chat'

// Cała rozmowa i stan problemu żyją tylko w przeglądarce (backend jest bezstanowy, ADR 0004).
// `history` i `state` to dokładnie to, co wysyłamy do POST /chat. Historia rośnie o wiadomość
// asystenta dopiero po zdarzeniu `done` (jej treść to `assistant_message`, odsyłany dosłownie),
// a `state` jest podmieniany na `done.state`.

export interface DisplayMessage {
  id: number
  from: 'user' | 'assistant'
  text: string
  question?: Question
  summary?: string
}

interface ChatData {
  /** Co widzi użytkownik (zdarzenia SSE), bez notatek technicznych z `assistant_message` */
  display: DisplayMessage[]
  /** Co wysyłamy do backendu */
  history: ApiMessage[]
  state: ChatState
  recentlyUpdated: ProblemKey[]
  /** Czy ostatnia wiadomość asystenta czeka na odpowiedź użytkownika */
  awaiting: 'question' | 'summary' | null
  summaryConfirmed: boolean
  results: Results | null
  streaming: boolean
  error: string | null
}

const initialData: ChatData = {
  display: [],
  history: [],
  state: INITIAL_STATE,
  recentlyUpdated: [],
  awaiting: null,
  summaryConfirmed: false,
  results: null,
  streaming: false,
  error: null,
}

type Action =
  | { type: 'send'; display: string; content: string; confirmSummary?: boolean }
  | { type: 'event'; event: ServerEvent }
  | { type: 'fail'; message: string }
  | { type: 'retry' }
  | { type: 'set_role'; role: Role }
  | { type: 'reset' }

const clip = (text: string) => text.slice(0, MAX_MESSAGE_CHARS)

/** Dopisuje wiadomość użytkownika; po nieudanej turze (brak odpowiedzi) łączy z poprzednią. */
function appendUser(history: ApiMessage[], content: string): ApiMessage[] {
  const last = history[history.length - 1]
  let next: ApiMessage[]
  if (last?.role === 'user') {
    next = [...history.slice(0, -1), { role: 'user', content: clip(`${last.content}\n${content}`) }]
  } else {
    next = [...history, { role: 'user', content: clip(content) }]
  }
  // Limit backendu: najwyżej MAX_MESSAGES wiadomości, historia ma zaczynać się od user.
  // Zdejmujemy po parze (user, assistant), więc kolejność zostaje zachowana.
  while (next.length > MAX_MESSAGES - 1) next = next.slice(2)
  return next
}

const nextId = (display: DisplayMessage[]) => (display.length ? display[display.length - 1].id + 1 : 1)

/** Ostatnia wiadomość asystenta w bieżącej turze (tworzy ją, jeśli jeszcze nie ma). */
function withAssistant(display: DisplayMessage[], update: (m: DisplayMessage) => DisplayMessage): DisplayMessage[] {
  const last = display[display.length - 1]
  if (last?.from === 'assistant') return [...display.slice(0, -1), update(last)]
  return [...display, update({ id: nextId(display), from: 'assistant', text: '' })]
}

function changedKeys(prev: ProblemFields, next: ProblemFields): ProblemKey[] {
  return PROBLEM_FIELDS.map((f) => f.key).filter((k) => (next[k] ?? null) !== (prev[k] ?? null))
}

function resultsLine(results: Results): string {
  if (!results.items.length) return 'Nie znalazłem w bazie żadnego rozwiązania pasującego do tego opisu.'
  if (results.no_good_match) return 'Nie ma w bazie rozwiązania, które dokładnie pasuje. Pod rozmową pokazuję najbliższe.'
  return `Znalazłem ${results.items.length} ${results.items.length === 1 ? 'rozwiązanie' : 'rozwiązania'}. Pokazuję je pod rozmową.`
}

/** Usuwa z końca pustą bańkę asystenta (np. po błędzie przed pierwszym tekstem). */
function dropEmptyAssistant(display: DisplayMessage[]): DisplayMessage[] {
  const last = display[display.length - 1]
  if (last?.from === 'assistant' && !last.text && !last.question && !last.summary) return display.slice(0, -1)
  return display
}

function reducer(data: ChatData, action: Action): ChatData {
  switch (action.type) {
    case 'send':
      return {
        ...data,
        display: [...data.display, { id: nextId(data.display), from: 'user', text: action.display }],
        history: appendUser(data.history, action.content),
        awaiting: null,
        recentlyUpdated: [],
        summaryConfirmed: data.summaryConfirmed || !!action.confirmSummary,
        streaming: true,
        error: null,
      }

    case 'fail':
      return { ...data, display: dropEmptyAssistant(data.display), streaming: false, error: action.message }

    case 'retry': {
      // Odrzuć niedokończoną odpowiedź z nieudanej tury — zdarzenia przyjdą od nowa
      let display = data.display
      while (display.length && display[display.length - 1].from === 'assistant') display = display.slice(0, -1)
      return { ...data, display, awaiting: null, recentlyUpdated: [], streaming: true, error: null }
    }

    case 'set_role':
      return { ...data, state: { ...data.state, role: action.role, role_locked: true } }

    case 'reset':
      return initialData

    case 'event': {
      const e = action.event
      switch (e.name) {
        case 'text':
          return { ...data, display: withAssistant(data.display, (m) => ({ ...m, text: m.text + e.data.text })) }

        case 'role':
          return { ...data, state: { ...data.state, role: e.data.role } }

        case 'problem_update': {
          const changed = changedKeys(data.state.problem, e.data.problem)
          return {
            ...data,
            state: { ...data.state, problem: e.data.problem },
            recentlyUpdated: [...new Set([...data.recentlyUpdated, ...changed])],
          }
        }

        case 'question':
          return {
            ...data,
            awaiting: 'question',
            display: withAssistant(data.display, (m) => ({ ...m, question: e.data })),
          }

        case 'summary': {
          const changed = changedKeys(data.state.problem, e.data.problem)
          return {
            ...data,
            awaiting: 'summary',
            state: { ...data.state, problem: e.data.problem },
            recentlyUpdated: [...new Set([...data.recentlyUpdated, ...changed])],
            display: withAssistant(data.display, (m) => ({ ...m, summary: e.data.summary })),
          }
        }

        case 'results':
          return {
            ...data,
            results: e.data,
            display: withAssistant(data.display, (m) => ({
              ...m,
              text: m.text ? `${m.text}\n${resultsLine(e.data)}` : resultsLine(e.data),
            })),
          }

        case 'done':
          return {
            ...data,
            history: [...data.history, { role: 'assistant', content: clip(e.data.assistant_message) }],
            state: e.data.state,
            display: dropEmptyAssistant(data.display),
            streaming: false,
          }

        case 'error':
          return { ...data, display: dropEmptyAssistant(data.display), streaming: false, error: e.data.message }
      }
    }
  }
}

interface ChatContextValue extends ChatData {
  /** Zwykła wiadomość użytkownika: wpisany tekst albo kliknięta opcja pytania */
  sendMessage: (text: string) => void
  confirmSummary: () => void
  /** Poprawka podsumowania: wysyłana jako zwykła wiadomość */
  correctSummary: (text: string) => void
  showResultsNow: () => void
  changeRole: (role: Role) => void
  retry: () => void
  reset: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [data, rawDispatch] = useReducer(reducer, initialData)
  // Ref zawsze zawiera najnowszy stan (reducer jest czysty), także między renderami
  const dataRef = useRef(data)
  const abortRef = useRef<AbortController | null>(null)
  const lastActionRef = useRef<ChatAction | undefined>(undefined)

  const dispatch = useCallback((action: Action) => {
    dataRef.current = reducer(dataRef.current, action)
    rawDispatch(action)
  }, [])

  const stream = useCallback(
    async (action: ChatAction | undefined) => {
      lastActionRef.current = action
      const controller = new AbortController()
      abortRef.current = controller
      const { history, state } = dataRef.current
      try {
        for await (const event of streamChat({ messages: history, state, action }, controller.signal)) {
          if (controller.signal.aborted) return
          dispatch({ type: 'event', event })
        }
      } catch (e) {
        if (controller.signal.aborted) return
        dispatch({
          type: 'fail',
          message: e instanceof ChatError ? e.message : 'Coś poszło nie tak. Spróbuj ponownie.',
        })
      }
    },
    [dispatch],
  )

  const send = useCallback(
    (display: string, content: string, action?: ChatAction) => {
      if (dataRef.current.streaming) return
      dispatch({ type: 'send', display, content, confirmSummary: action === 'confirm_summary' })
      void stream(action)
    },
    [dispatch, stream],
  )

  const value = useMemo<ChatContextValue>(
    () => ({
      ...data,
      sendMessage: (text) => send(text, text),
      confirmSummary: () => send('Potwierdzam podsumowanie.', ACTION_HISTORY_TEXT.confirm_summary, 'confirm_summary'),
      correctSummary: (text) => send(text, `Poprawiam podsumowanie: ${text}`),
      showResultsNow: () => send('Pokaż wyniki teraz.', ACTION_HISTORY_TEXT.show_results_now, 'show_results_now'),
      changeRole: (role) => {
        if (dataRef.current.streaming) return
        dispatch({ type: 'set_role', role })
        // Rola wpływa na kolejność wyników — gdy już są, odśwież je z nową rolą
        if (dataRef.current.results) {
          send('Zmieniłem rolę. Odśwież wyniki.', ACTION_HISTORY_TEXT.show_results_now, 'show_results_now')
        }
      },
      retry: () => {
        if (dataRef.current.streaming || !dataRef.current.error) return
        dispatch({ type: 'retry' })
        void stream(lastActionRef.current)
      },
      reset: () => {
        abortRef.current?.abort()
        dispatch({ type: 'reset' })
      },
    }),
    [data, dispatch, send, stream],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
