import { Component, createRef, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** `page`: cała strona zastąpiona komunikatem; `block`: tylko fragment ekranu */
  variant?: 'page' | 'block'
  /** Zmiana wartości czyści błąd (np. `pathname` przy zmianie trasy) */
  resetKey?: unknown
  /** Nazwa fragmentu w komunikacie bloku, np. „wyniki” */
  label?: string
}

interface State {
  error: Error | null
}

/** Błąd pobrania lazy chunka, zwykle po nowym wdrożeniu (stary plik już nie istnieje). */
function isChunkError(error: Error) {
  return /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch/i.test(error.message)
}

/** Łapie tylko błędy renderu; błędy handlerów i kodu asynchronicznego obsługuje kod wywołujący. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }
  private alertRef = createRef<HTMLDivElement>()

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  componentDidUpdate(prev: Props, prevState: State) {
    if (this.state.error && !prevState.error) this.alertRef.current?.focus()
    else if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    const { children, variant = 'block', label } = this.props
    if (!error) return children

    const chunk = isChunkError(error)
    const reload = () => window.location.reload()

    if (variant === 'page') {
      return (
        <div className="error-boundary error-boundary-page" role="alert" tabIndex={-1} ref={this.alertRef}>
          <h1>Coś poszło nie tak</h1>
          <p>
            {chunk
              ? 'Strona została zaktualizowana, a ta wersja jest już nieaktualna. Odśwież stronę, żeby wczytać nową.'
              : 'Wystąpił nieoczekiwany błąd. Odśwież stronę. Jeśli problem wraca, wróć na stronę główną.'}
          </p>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={reload}>
              Odśwież stronę
            </button>
            <a className="btn btn-ghost" href="/">
              Strona główna
            </a>
          </div>
        </div>
      )
    }

    return (
      <div className="alert alert-error error-boundary" role="alert" tabIndex={-1} ref={this.alertRef}>
        <p>
          {chunk
            ? 'Nie udało się wczytać tej części strony. Odśwież stronę, żeby pobrać nową wersję.'
            : `Nie udało się wyświetlić fragmentu strony${label ? `: ${label}` : ''}. Reszta strony działa.`}
        </p>
        {chunk ? (
          <button type="button" className="btn btn-secondary" onClick={reload}>
            Odśwież stronę
          </button>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => this.setState({ error: null })}>
            Spróbuj ponownie
          </button>
        )}
      </div>
    )
  }
}
