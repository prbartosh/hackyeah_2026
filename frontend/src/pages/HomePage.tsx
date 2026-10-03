import ChatPanel from '@/components/ChatPanel'
import ProblemPanel from '@/components/ProblemPanel'
import ResultsSection from '@/components/ResultsSection'

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="container">
          <h1 id="hero-title">Splot – opisz problem, znajdź rozwiązanie</h1>
          <p className="hero-lead">
            Wyszukujemy sprawdzone innowacje społeczne z Biblioteki Innowacji Społecznych ROPS w Krakowie —
            dla mieszkańców, opiekunów, samorządów i organizacji.
          </p>
          <ol className="hero-steps">
            <li><strong>Opisz problem</strong> własnymi słowami lub podyktuj go.</li>
            <li><strong>Odpowiedz na kilka pytań</strong> — wystarczy kliknąć odpowiedź.</li>
            <li><strong>Sprawdź wyniki</strong> — do 5 rozwiązań z wyjaśnieniem i kontaktem.</li>
          </ol>
          <p className="hero-note">Bez logowania. Rozmowa zostaje tylko w Twojej przeglądarce.</p>
        </div>
      </section>

      <div className="container workspace">
        <ProblemPanel />
        <ChatPanel />
      </div>

      <div className="container">
        <ResultsSection />
      </div>
    </>
  )
}
