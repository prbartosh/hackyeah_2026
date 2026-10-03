import ChatPanel from '@/components/ChatPanel'
import ErrorBoundary from '@/components/ErrorBoundary'
import ProblemPanel from '@/components/ProblemPanel'
import ResultsSection from '@/components/ResultsSection'
import { useChat } from '@/context/ChatContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function HomePage() {
  const { display } = useChat()
  useDocumentTitle('Splot – opisz problem, znajdź rozwiązanie')
  const started = display.length > 0

  return (
    <>
      <div className={`wide workspace${started ? ' has-panel' : ''}`}>
        {started && <ProblemPanel />}
        <ChatPanel />
      </div>

      <div className="wide">
        <ErrorBoundary label="wyniki">
          <ResultsSection />
        </ErrorBoundary>
      </div>
    </>
  )
}
