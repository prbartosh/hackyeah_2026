import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download, ExternalLink, FileText, PlayCircle } from 'lucide-react'
import { getInnovation } from '@/api/innovations'
import { useChat } from '@/context/ChatContext'
import { kategoriaNazwa, type Innowacja } from '@/types/innowacja'

function Section({ title, text }: { title: string; text: string | null }) {
  return (
    <section className="detail-section">
      <h2>{title}</h2>
      <p>{text ?? <span className="empty">Brak danych w bazie.</span>}</p>
    </section>
  )
}

function NewTab() {
  return <span className="visually-hidden"> (otwiera się w nowej karcie)</span>
}

export default function InnovationPage() {
  const { slug = '' } = useParams()
  const { results } = useChat()
  const [state, setState] = useState<{ slug: string; data: Innowacja | null; failed?: boolean } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getInnovation(slug, controller.signal)
      .then((data) => setState({ slug, data }))
      .catch((e) => { if (!controller.signal.aborted) setState({ slug, data: null, failed: e instanceof Error }) })
    return () => controller.abort()
  }, [slug])

  const backLink = results ? (
    <Link to="/#wyniki">← Wróć do wyników wyszukiwania</Link>
  ) : (
    <Link to="/">← Wróć do strony głównej</Link>
  )

  if (!state || state.slug !== slug) {
    return <div className="container page"><p role="status">Wczytywanie opisu rozwiązania…</p></div>
  }
  const rec = state.data
  if (state.failed) {
    return (
      <div className="container page">
        <h1>Nie udało się wczytać rozwiązania</h1>
        <p role="alert">Brak połączenia z serwerem. Odśwież stronę albo spróbuj za chwilę.</p>
        <p>{backLink}</p>
      </div>
    )
  }
  if (!rec) {
    return (
      <div className="container page">
        <h1>Nie znaleziono rozwiązania</h1>
        <p>Ta pozycja nie istnieje w bazie lub została usunięta.</p>
        <p>{backLink}</p>
      </div>
    )
  }

  const kategoria = kategoriaNazwa(rec.kategorie)
  return (
    <div className="container page">
      <nav aria-label="Ścieżka nawigacji" className="breadcrumbs">
        <ol>
          <li><Link to="/">Strona główna</Link></li>
          {results && <li><Link to="/#wyniki">Wyniki</Link></li>}
          <li aria-current="page">{rec.nazwa}</li>
        </ol>
      </nav>

      <div className="detail-layout">
        <article className="detail-main">
          {kategoria && <p className="detail-kicker">{kategoria}</p>}
          <h1>{rec.nazwa}</h1>
          {rec.wybrana_do_upowszechniania && <p className="badge">Polecana przez ROPS do upowszechniania</p>}

          <Section title="Na czym polega rozwiązanie" text={rec.opis} />
          <Section title="Jakich problemów dotyczy" text={rec.problem} />
          <Section title="Dla kogo" text={rec.grupa_docelowa} />
          <Section title="Kto może wdrożyć" text={rec.kto_moze_skorzystac} />
          <Section title="Czy to działa — ocena ROPS" text={rec.czy_dziala} />

          <section className="detail-section">
            <h2>Koszt i czas wdrożenia</h2>
            <p><span className="empty">Brak danych.</span> Biblioteka ROPS nie podaje kosztu ani czasu wdrożenia. Mogą być opisane w materiałach do pobrania.</p>
          </section>
        </article>

        <aside className="detail-side" aria-label="Materiały i kontakt">
          <section className="side-box">
            <h2>Materiały do pobrania</h2>
            <ul className="link-list">
              {rec.materialy_url && (
                <li>
                  <a href={rec.materialy_url}>
                    <Download size={20} aria-hidden="true" /> Pakiet materiałów (ZIP)
                  </a>
                </li>
              )}
              {rec.pdf_url && (
                <li>
                  <a href={rec.pdf_url} target="_blank" rel="noreferrer">
                    <FileText size={20} aria-hidden="true" /> Folder informacyjny (PDF)<NewTab />
                  </a>
                </li>
              )}
              {rec.youtube_url && (
                <li>
                  <a href={rec.youtube_url} target="_blank" rel="noreferrer">
                    <PlayCircle size={20} aria-hidden="true" /> Film o rozwiązaniu<NewTab />
                  </a>
                </li>
              )}
            </ul>
          </section>

          <section className="side-box">
            <h2>Kontakt</h2>
            <dl className="contact-list">
              <dt>Autor rozwiązania</dt>
              <dd>{rec.organizacja ?? <span className="empty">Brak danych w bazie</span>}</dd>
              <dt>Opiekun biblioteki</dt>
              <dd>
                Regionalny Ośrodek Polityki Społecznej w Krakowie
                <br />
                <a href="mailto:iws@rops.krakow.pl">iws@rops.krakow.pl</a>
              </dd>
            </dl>
            <a href={rec.url_zrodlowy} className="btn btn-secondary btn-block" target="_blank" rel="noreferrer">
              Strona źródłowa ROPS <ExternalLink size={18} aria-hidden="true" /><NewTab />
            </a>
          </section>

          <section className="side-box">
            <h2>Licencja</h2>
            <p>
              {rec.licencja ? (
                <a href={rec.licencja} target="_blank" rel="noreferrer">Creative Commons CC BY 4.0<NewTab /></a>
              ) : (
                'Zasady wykorzystania innowacji MIIS — szczegóły na stronie źródłowej.'
              )}
            </p>
            {rec.pobrano_dnia && <p className="hint">Dane pobrano: {rec.pobrano_dnia}</p>}
          </section>
        </aside>
      </div>

      <p className="back-link">{backLink}</p>
    </div>
  )
}
