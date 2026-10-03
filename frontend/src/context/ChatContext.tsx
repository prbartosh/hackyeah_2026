import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { ChatError, streamChat } from '@/api/chat'
import {
  ACTION_HISTORY_TEXT,
  MAX_MESSAGES,
  MAX_MESSAGE_CHARS,
  PROBLEM_FIELDS,
  initialState,
  type ApiMessage,
  type ChatAction,
  type ChatState,
  type ProblemKey,
  type ProblemState,
  type Question,
  type Results,
  type Role,
  type ServerEvent,
} from '@/types/chat'

// Cała rozmowa i stan problemu żyją tylko w przeglądarce (backend jest bezstanowy, ADR 0005).
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

const initialData = (): ChatData => ({
  display: [],
  history: [],
  state: initialState(),
  recentlyUpdated: [],
  awaiting: null,
  summaryConfirmed: false,
  results: null,
  streaming: false,
  error: null,
})

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

/** Pola panelu, których tekst się zmienił (do oznaczenia „nowe”). */
function changedKeys(prev: ProblemState, next: ProblemState): ProblemKey[] {
  return PROBLEM_FIELDS.map((f) => f.key).filter((k) => (next[k]?.tekst ?? null) !== (prev[k]?.tekst ?? null))
}

/** Panel z backendu podmienia pola problemu w płaskim stanie (rola, blokada i licznik rund zostają). */
function withProblem(state: ChatState, problem: ProblemState): ChatState {
  return { ...state, ...problem }
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
      return { ...data, state: { ...data.state, rola: action.role, role_locked: true } }

    case 'reset':
      return initialData()

    case 'event': {
      const e = action.event
      switch (e.name) {
        case 'text':
          return { ...data, display: withAssistant(data.display, (m) => ({ ...m, text: m.text + e.data.text })) }

        case 'role':
          return { ...data, state: { ...data.state, rola: e.data.rola } }

        case 'problem_update': {
          const changed = changedKeys(data.state, e.data.problem)
          return {
            ...data,
            state: withProblem(data.state, e.data.problem),
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
          const changed = changedKeys(data.state, e.data.problem)
          return {
            ...data,
            awaiting: 'summary',
            state: withProblem(data.state, e.data.problem),
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
          // Zdarzenie error to zawsze problem po stronie asystenta AI (np. API modelu) — bez technicznych szczegółów
          return {
            ...data,
            display: dropEmptyAssistant(data.display),
            streaming: false,
            error: 'Asystent AI nie mógł teraz odpowiedzieć. Spróbuj ponownie.',
          }

      }
    }
  }
}

interface ChatContextValue extends ChatData {
  /** Zwykła wiadomość użytkownika: wpisany tekst albo kliknięta opcja pytania */
  sendMessage: (text: string) => void
  /** Zatwierdzenie podsumowania; z argumentem — wersja poprawiona przez użytkownika (pole `summary`) */
  confirmSummary: (correctedSummary?: string) => void
  showResultsNow: () => void
  changeRole: (role: Role) => void
  retry: () => void
  reset: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [data, rawDispatch] = useReducer(reducer, undefined, initialData)
  // Ref zawsze zawiera najnowszy stan (reducer jest czysty), także między renderami
  const dataRef = useRef(data)
  const abortRef = useRef<AbortController | null>(null)
  const lastRequestRef = useRef<{ action?: ChatAction; summary?: string }>({})

  const dispatch = useCallback((action: Action) => {
    dataRef.current = reducer(dataRef.current, action)
    rawDispatch(action)
  }, [])

  const stream = useCallback(
    async (action?: ChatAction, summary?: string) => {
      lastRequestRef.current = { action, summary }
      const controller = new AbortController()
      abortRef.current = controller
      const { history, state } = dataRef.current
      try {
        for await (const event of streamChat({ messages: history, state, action, summary }, controller.signal)) {
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
    (display: string, content: string, action?: ChatAction, summary?: string) => {
      if (dataRef.current.streaming) return
      dispatch({ type: 'send', display, content, confirmSummary: action === 'confirm_summary' })
      void stream(action, summary)
    },
    [dispatch, stream],
  )

  const value = useMemo<ChatContextValue>(
    () => ({
      ...data,
      sendMessage: (text) => send(text, text),
      confirmSummary: (correctedSummary) =>
        send(
          correctedSummary ? `Zatwierdzam poprawione podsumowanie:\n${correctedSummary}` : 'Potwierdzam podsumowanie.',
          ACTION_HISTORY_TEXT.confirm_summary,
          'confirm_summary',
          correctedSummary,
        ),
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
        const { action, summary } = lastRequestRef.current
        void stream(action, summary)
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
