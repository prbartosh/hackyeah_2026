import { Link } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// Wyniki z notatek zadań 0020 i 0022 (Playwright + axe-core, lokalnie, dane demo, 2026-10-04)
const THEMES = ['Jasny', 'Ciemny', 'Wysoki kontrast']
const WIDTHS = ['Desktop (1280 px)', 'Mobile (375 px)']
const AXE_ROWS = THEMES.flatMap((theme) =>
  WIDTHS.map((width) => ({ theme, width, routes: 21, violations: 0 })),
)

const TODO = 'do uzupełnienia przez ROPS'

export default function AccessibilityPage() {
  useDocumentTitle('Deklaracja dostępności · Splot')
  return (
    <div className="container page a11y-statement">
      <h1>Deklaracja dostępności</h1>

      <section aria-labelledby="dd-wstep">
        <h2 id="dd-wstep">Wstęp</h2>
        <p>
          Ta deklaracja dotyczy aplikacji internetowej <strong>Splot</strong>, prototypu
          przygotowanego na HackYeah 2026 dla Regionalnego Ośrodka Polityki Społecznej w Krakowie.
          Przygotowano ją na wzór deklaracji z ustawy z 4 kwietnia 2019 r. o dostępności cyfrowej
          stron internetowych i aplikacji mobilnych podmiotów publicznych.
        </p>
        <p>
          Splot jest prototypem, a nie oficjalną stroną podmiotu publicznego. Pola oznaczone jako
          „{TODO}” musi wypełnić ROPS przed ewentualnym wdrożeniem.
        </p>
        <ul>
          <li>Data publikacji aplikacji: {TODO}</li>
          <li>Data publikacji deklaracji: 4 października 2026 r.</li>
          <li>Data ostatniej aktualizacji deklaracji: 4 października 2026 r.</li>
        </ul>
      </section>

      <section aria-labelledby="dd-status">
        <h2 id="dd-status">Status pod względem zgodności z WCAG 2.1 AA</h2>
        <p>
          Aplikacja jest <strong>częściowo zgodna</strong> z WCAG 2.1 na poziomie AA. Testy
          automatyczne i testy klawiaturą nie wykazały naruszeń, a ręczny test czytnikiem ekranu
          (NVDA) jest w toku, dlatego nie deklarujemy pełnej zgodności.
        </p>
      </section>

      <section aria-labelledby="dd-niedostepne">
        <h2 id="dd-niedostepne">Treści niedostępne</h2>
        <ul>
          <li>
            Dokumenty PDF opublikowane przez ROPS (raporty, publikacje) mogą nie spełniać wymogów
            dostępności. Dlatego każdy dokument w Zasobniku wiedzy ma wersję tekstową na stronie
            aplikacji.
          </li>
          <li>
            Osadzone filmy z YouTube: nie gwarantujemy napisów ani transkrypcji. Film ładuje się
            dopiero po kliknięciu.
          </li>
          <li>
            Obsługa czytnika ekranu NVDA nie została jeszcze potwierdzona we wszystkich modułach
            (m.in. czat, panel administratora, kreator, tester innowacji).
          </li>
        </ul>
      </section>

      <section aria-labelledby="dd-metoda">
        <h2 id="dd-metoda">Przygotowanie deklaracji i metoda oceny</h2>
        <p>
          Deklarację przygotowano 4 października 2026 r. na podstawie samooceny zespołu tworzącego
          prototyp. Nie wykonano zewnętrznego audytu. Sprawdzenia wykonano automatycznie
          (Playwright i axe-core) oraz ręcznie klawiaturą, przy zoomie 200% i szerokości 320 px.
          Szczegóły w sekcji „Jak sprawdzaliśmy”.
        </p>
      </section>

      <section aria-labelledby="dd-sprawdzanie">
        <h2 id="dd-sprawdzanie">Jak sprawdzaliśmy</h2>
        <p>
          axe-core (reguły WCAG 2.0–2.2 poziomów A i AA oraz dobre praktyki) uruchomiono na 21
          trasach: publicznych, kreatora, panelu administratora i stronie 404. Pomiar lokalny,
          na danych demonstracyjnych.
        </p>
        <table className="a11y-table">
          <caption>Wyniki axe-core: liczba naruszeń według motywu i szerokości ekranu</caption>
          <thead>
            <tr>
              <th scope="col">Motyw</th>
              <th scope="col">Szerokość</th>
              <th scope="col">Sprawdzone trasy</th>
              <th scope="col">Naruszenia</th>
            </tr>
          </thead>
          <tbody>
            {AXE_ROWS.map((r) => (
              <tr key={`${r.theme}-${r.width}`}>
                <th scope="row">{r.theme}</th>
                <td>{r.width}</td>
                <td>{r.routes}</td>
                <td>{r.violations}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Dodatkowo sprawdzono motywy ciemny i wysoki kontrast w trzech rozmiarach tekstu
          (normalny, duży, bardzo duży) na stronach głównej, Zasobniku, zgłoszeń i kreatora,
          również bez naruszeń.
        </p>
        <p>
          Automat nie ocenia treści ani kolejności czytania.{' '}
          <strong>Test czytnikiem ekranu NVDA jest w toku</strong> i nie ma jeszcze wyników.
        </p>
      </section>

      <section aria-labelledby="dd-funkcje">
        <h2 id="dd-funkcje">Skróty klawiszowe i ułatwienia</h2>
        <ul>
          <li>
            <strong>Pasek dostępności:</strong> trzy rozmiary tekstu (normalny, duży, bardzo duży)
            oraz trzy motywy: jasny, ciemny i wysoki kontrast.
          </li>
          <li>
            <strong>Dyktowanie głosowe:</strong> przycisk głosowy przy polach tekstowych, stan
            nagrywania jest podawany tekstem, nie tylko kolorem. Działa tam, gdzie przeglądarka
            udostępnia rozpoznawanie mowy. Sprawdzenie w Chrome, Safari i Firefox jest w toku.
          </li>
          <li>
            <strong>Skip link:</strong> pierwszy element po wejściu na stronę klawiszem Tab
            przenosi do treści głównej.
          </li>
          <li>
            <strong>Obsługa klawiaturą:</strong> na 12 sprawdzonych trasach Tab dociera do
            wszystkich widocznych elementów, a każdy ma widoczny fokus. Po zmianie strony fokus
            trafia na treść, a nowy tytuł jest zapowiadany czytnikowi ekranu.
          </li>
          <li>
            <strong>Czcionki lokalnie:</strong> aplikacja nie wysyła zapytań do usług Google
            (Open Sans jest serwowana z własnego serwera).
          </li>
          <li>
            <strong>Ograniczony ruch:</strong> animacje respektują ustawienie systemowe{' '}
            <code>prefers-reduced-motion</code>.
          </li>
          <li>
            <strong>Powiększenie:</strong> układ działa przy powiększeniu do 200% i przy
            szerokości 320 px.
          </li>
        </ul>
        <p>
          Aplikacja nie definiuje własnych skrótów klawiszowych poza standardowymi: Tab,
          Shift+Tab, Enter, Spacja i Esc (zamyka panel ustawień dostępności na telefonie).
        </p>
      </section>

      <section aria-labelledby="dd-kontakt">
        <h2 id="dd-kontakt">Informacje zwrotne i dane kontaktowe</h2>
        <p>
          Problemy z dostępnością i prośby o treści w innej formie można zgłaszać na adres{' '}
          <a href="mailto:iws@rops.krakow.pl">iws@rops.krakow.pl</a>. Można też użyć formularza{' '}
          <Link to="/zglos">Zgłoś potrzebę</Link>.
        </p>
        <ul>
          <li>Koordynator dostępności: {TODO}</li>
          <li>Telefon: {TODO}</li>
          <li>Termin odpowiedzi na zgłoszenie: {TODO}</li>
        </ul>
      </section>

      <section aria-labelledby="dd-skargi">
        <h2 id="dd-skargi">Procedura wnioskowo-skargowa</h2>
        <p>
          Każdy ma prawo wystąpić z żądaniem zapewnienia dostępności cyfrowej strony lub aplikacji
          albo ich elementu. Żądanie należy skierować do podmiotu publicznego na adres podany
          wyżej, opisując problem i preferowany sposób kontaktu. Jeśli odpowiedź jest
          niezadowalająca, można złożyć skargę do Rzecznika Praw Obywatelskich. Pełny opis
          procedury i dane organu: {TODO}.
        </p>
      </section>

      <section aria-labelledby="dd-arch">
        <h2 id="dd-arch">Dostępność architektoniczna</h2>
        <p>Nie dotyczy prototypu. Informacje o dostępności budynku ROPS: {TODO}.</p>
      </section>
    </div>
  )
}
