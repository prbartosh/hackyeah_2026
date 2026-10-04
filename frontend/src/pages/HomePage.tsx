import { Link } from 'react-router-dom'
import ChatPanel from '@/components/ChatPanel'
import ErrorBoundary from '@/components/ErrorBoundary'
import ProblemPanel from '@/components/ProblemPanel'
import ResultsSection from '@/components/ResultsSection'
import { useChat } from '@/context/ChatContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import '@/styles/cooperation.css'

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

      <p className="wide home-coop">
        Nie ma tego, czego szukasz? <Link to="/wspolpraca">Zobacz, jak współpracować z ROPS</Link>.
      </p>
    </>
  )
}
