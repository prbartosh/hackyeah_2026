import { createContext, useCallback, useContext, useReducer, useRef, type ReactNode } from 'react'
import { streamChat } from '@/api/chat'
import type { ChatAction, ChatEvent, ProblemField, ProblemState, Question, ResultItem, Role } from '@/types/chat'

// Cała rozmowa i stan problemu żyją tylko w przeglądarce (docs/DEMO.md: backend jest bezstanowy)

export interface Message {
  id: number
  from: 'user' | 'assistant'
  text: string
  question?: Question
  summary?: string
}

interface ChatState {
  messages: Message[]
  role: Role | null
  problem: ProblemState
  recentlyUpdated: ProblemField[]
  pendingQuestion: Question | null
  rounds: number
  summary: { text: string; status: 'pending' | 'confirmed' } | null
  results: { items: ResultItem[]; no_match: boolean } | null
  streaming: boolean
  demoMode: boolean
  error: string | null
}

const initialState: ChatState = {
  messages: [],
  role: null,
  problem: {},
  recentlyUpdated: [],
  pendingQuestion: null,
  rounds: 0,
  summary: null,
  results: null,
  streaming: false,
  demoMode: false,
  error: null,
}

type Action =
  | { type: 'user_message'; text: string }
  | { type: 'start' }
  | { type: 'event'; event: ChatEvent }
  | { type: 'finish' }
  | { type: 'fail'; message: string }
  | { type: 'set_role'; role: Role }
  | { type: 'confirm_summary'; text: string }
  | { type: 'reset' }

let nextId = 1

function lastAssistant(messages: Message[]): [Message[], Message] {
  const last = messages[messages.length - 1]
  if (last?.from === 'assistant') return [messages.slice(0, -1), last]
  return [messages, { id: nextId++, from: 'assistant', text: '' }]
}

function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case 'user_message':
      return {
        ...state,
        messages: [...state.messages, { id: nextId++, from: 'user', text: action.text }],
        pendingQuestion: null,
      }
    case 'start':
      return { ...state, streaming: true, error: null, recentlyUpdated: [] }
    case 'finish':
      return { ...state, streaming: false }
    case 'fail':
      return { ...state, streaming: false, error: action.message }
    case 'set_role':
      return { ...state, role: action.role }
    case 'confirm_summary':
      return { ...state, summary: { text: action.text, status: 'confirmed' } }
    case 'reset':
      return initialState
    case 'event': {
      const e = action.event
      switch (e.type) {
        case 'text': {
          const [rest, msg] = lastAssistant(state.messages)
          return { ...state, messages: [...rest, { ...msg, text: msg.text + e.delta }] }
        }
        case 'role':
          return { ...state, role: e.role }
        case 'question': {
          const [rest, msg] = lastAssistant(state.messages)
          return {
            ...state,
            pendingQuestion: e.question,
            rounds: state.rounds + 1,
            messages: [...rest, { ...msg, question: e.question }],
          }
        }
        case 'problem_update':
          return {
            ...state,
            problem: { ...state.problem, ...e.fields },
            recentlyUpdated: Object.keys(e.fields) as ProblemField[],
          }
        case 'summary': {
          const [rest, msg] = lastAssistant(state.messages)
          return {
            ...state,
            summary: { text: e.text, status: 'pending' },
            messages: [...rest, { ...msg, summary: e.text }],
          }
        }
        case 'results':
          return { ...state, results: { items: e.items, no_match: e.no_match } }
        case 'demo_mode':
          return { ...state, demoMode: true }
        case 'error':
          return { ...state, error: e.message }
      }
    }
  }
  return state
}

interface ChatContextValue extends ChatState {
  sendMessage: (text: string) => void
  answerQuestion: (text: string) => void
  confirmSummary: (text: string) => void
  showResultsNow: () => void
  changeRole: (role: Role) => void
  reset: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(
    async (action: ChatAction, opts: { userText?: string; questionId?: string; summary?: string; role?: Role } = {}) => {
      const s = stateRef.current
      if (s.streaming) return
      if (opts.userText) dispatch({ type: 'user_message', text: opts.userText })
      dispatch({ type: 'start' })
      abortRef.current = new AbortController()

      const history = [...s.messages, ...(opts.userText ? [{ from: 'user' as const, text: opts.userText }] : [])]
      try {
        for await (const event of streamChat(
          {
            messages: history.map((m) => ({ role: m.from, content: m.text })),
            problem: s.problem,
            role: opts.role ?? s.role,
            action,
            rounds: s.rounds,
            question_id: opts.questionId,
            summary: opts.summary ?? s.summary?.text,
          },
          abortRef.current.signal,
        )) {
          dispatch({ type: 'event', event })
        }
        dispatch({ type: 'finish' })
      } catch {
        dispatch({ type: 'fail', message: 'Nie udało się połączyć z serwerem. Sprawdź połączenie z internetem i spróbuj ponownie.' })
      }
    },
    [],
  )

  const value: ChatContextValue = {
    ...state,
    sendMessage: (text) => {
      const q = stateRef.current.pendingQuestion
      // Wpisana odpowiedź przy otwartym pytaniu traktowana jest jak odpowiedź „inne”
      if (q) void run('answer', { userText: text, questionId: q.id })
      else void run('message', { userText: text })
    },
    answerQuestion: (text) => {
      const q = stateRef.current.pendingQuestion
      void run('answer', { userText: text, questionId: q?.id })
    },
    confirmSummary: (text) => {
      dispatch({ type: 'confirm_summary', text })
      void run('confirm_summary', { userText: 'Podsumowanie się zgadza, możesz szukać.', summary: text })
    },
    showResultsNow: () => void run('show_results_now', { userText: 'Pokaż wyniki teraz.' }),
    changeRole: (role) => {
      dispatch({ type: 'set_role', role })
      // Rola wpływa na kolejność wyników — jeśli są już wyniki, odśwież je
      if (stateRef.current.results) void run('show_results_now', { role })
      else if (stateRef.current.messages.length) void run('change_role', { role })
    },
    reset: () => {
      abortRef.current?.abort()
      dispatch({ type: 'reset' })
    },
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
