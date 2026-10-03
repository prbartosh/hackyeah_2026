import ChatPanel from '@/components/ChatPanel'
import ProblemPanel from '@/components/ProblemPanel'
import ResultsSection from '@/components/ResultsSection'
import { useChat } from '@/context/ChatContext'

export default function HomePage() {
  const { display } = useChat()
  // Panel „Twój problem” pojawia się dopiero po rozpoczęciu rozmowy
  const started = display.length > 0

  return (
    <>
      <div className={`wide workspace${started ? ' has-panel' : ''}`}>
        {started && <ProblemPanel />}
        <ChatPanel />
      </div>

      <div className="wide">
        <ResultsSection />
      </div>
    </>
  )
}
