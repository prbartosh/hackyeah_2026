import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import '@/styles/otwarte-dane.css'

const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'
const PREFIX = `${BASE}/otwarte-dane`

interface Summary {
  innowacje: number
  innowacje_z_licencja: number
  dokumenty: number
  dokumenty_z_licencja: number
}

const ZBIORY = [
  {
    id: 'innowacje',
    nazwa: 'Innowacje społeczne',
    opis: 'Opublikowane innowacje z Biblioteki Innowacji Społecznych: nazwa, kategorie, problem, grupa docelowa, kto może skorzystać, organizacja, czy wybrana do upowszechniania, linki do Splotu i do źródła.',
    liczba: (s: Summary) => s.innowacje,
  },
  {
    id: 'dokumenty',
    nazwa: 'Dokumenty Zasobnika wiedzy',
    opis: 'Raporty, publikacje, Mapa Wyzwań i wskaźniki Obserwatora: tytuł, opis, rok, kategoria, źródło danych, linki. Bez pełnej treści dokumentów.',
    liczba: (s: Summary) => s.dokumenty,
  },
] as const

export default function OpenDataPage() {
  useDocumentTitle('Otwarte dane · Splot')
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    // Liczba rekordów jest dodatkiem: bez niej przyciski pobrania działają tak samo
    fetch(PREFIX)
      .then((r) => (r.ok ? r.json() : null))
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  const origin = window.location.origin

  return (
    <div className="container page open-data">
      <h1>Otwarte dane</h1>
      <p>
        Splot nie zamyka danych w aplikacji. Publiczne dane z bazy innowacji i Zasobnika wiedzy można pobrać
        w formatach otwartych i wykorzystać na stronie ROPS, w portalu dane.gov.pl albo we własnej analizie.
        Nie ma logowania ani klucza API.
      </p>

      <div className="od-grid" data-tour="zasobnik-otwarte-zbiory">
        {ZBIORY.map((z) => (
          <section key={z.id} className="od-card" aria-labelledby={`od-${z.id}`}>
            <h2 id={`od-${z.id}`}>{z.nazwa}</h2>
            <p>{z.opis}</p>
            <p className="hint">
              {summary ? `${z.liczba(summary)} rekordów` : 'Liczba rekordów: chwilowo niedostępna'} · CSV: UTF-8 z BOM,
              separator „;” (otwiera się w Excelu) · JSON: tablica obiektów
            </p>
            <div className="btn-row">
              <a className="btn btn-primary" href={`${PREFIX}/${z.id}.csv`} download data-tour={`zasobnik-otwarte-csv-${z.id}`}>
                Pobierz CSV
              </a>
              <a className="btn btn-secondary" href={`${PREFIX}/${z.id}.json`} download data-tour={`zasobnik-otwarte-json-${z.id}`}>
                Pobierz JSON
              </a>
            </div>
          </section>
        ))}
      </div>

      <h2 data-tour="zasobnik-otwarte-licencje">Źródło i licencje</h2>
      <p>
        Dane pochodzą z ROPS Kraków i każdy rekord ma pole <code>zrodlo</code> („ROPS Kraków”) oraz link do
        oryginału (<code>url_zrodlowy</code>). Pole <code>licencja</code> wypełniamy tylko tam, gdzie podaje ją
        ROPS, niczego nie dopisujemy.
      </p>
      <ul>
        <li>
          Biblioteka Innowacji Społecznych: treści na licencji CC BY 4.0 według strony ROPS
          {summary ? `; w eksporcie pole licencji ma ${summary.innowacje_z_licencja} z ${summary.innowacje} innowacji` : ''}.
        </li>
        <li>
          Raporty z badań: CC BY 4.0 przy 5 z 51 raportów, pozostałe nie mają licencji na stronie ROPS (pole
          puste).
        </li>
        <li>Publikacje, Mapa Wyzwań, Social Canvas: licencja nieustalona (pole puste).</li>
        <li>
          Wskaźniki Obserwatora: dane m.in. z GUS, które wolno wykorzystywać z podaniem źródła (kolumna{' '}
          <code>zrodlo_danych</code>).
        </li>
      </ul>
      <p className="hint">
        W sprawie zasad ponownego wykorzystania danych bez licencji pisz do ROPS:{' '}
        <a href="mailto:iws@rops.krakow.pl">iws@rops.krakow.pl</a>.
      </p>

      <h2>Dla programistów</h2>
      <p>Wszystkie adresy to zwykłe żądania GET, dostępne pod tym samym adresem co strona.</p>
      <div data-tour="zasobnik-otwarte-api" className="od-table-wrap" role="region" aria-label="Adresy eksportów" tabIndex={0}>
        <table className="od-table">
          <caption className="visually-hidden">Adresy eksportów</caption>
          <thead>
            <tr>
              <th scope="col">Adres</th>
              <th scope="col">Zawartość</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>/api/v1/otwarte-dane/innowacje.csv</code></td><td>innowacje, CSV</td></tr>
            <tr><td><code>/api/v1/otwarte-dane/innowacje.json</code></td><td>innowacje, JSON</td></tr>
            <tr><td><code>/api/v1/otwarte-dane/dokumenty.csv</code></td><td>dokumenty, CSV</td></tr>
            <tr><td><code>/api/v1/otwarte-dane/dokumenty.json</code></td><td>dokumenty, JSON</td></tr>
            <tr><td><code>/api/v1/otwarte-dane</code></td><td>liczba rekordów w eksportach</td></tr>
          </tbody>
        </table>
      </div>
      <p>Przykład:</p>
      <pre className="od-code" tabIndex={0}>
        <code>{`curl -O ${origin}/api/v1/otwarte-dane/innowacje.json`}</code>
      </pre>

      <p>
        <Link to="/zasobnik">Przejdź do Zasobnika wiedzy</Link>
      </p>
    </div>
  )
}
