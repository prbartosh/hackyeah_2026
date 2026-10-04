import { Link } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// Wynik pomiaru z zadania 0022 (docs/tasks/0022-dostepnosc-nvda-klawiatura.md). Po nowym pomiarze popraw tu daty i liczby.
const AXE_DATE = '2026-10-04'
const AXE_RESULTS = [
  { scope: 'Trasy', value: '21 (strony publiczne, Kreator pomysłów, panel pracownika, strona 404)' },
  { scope: 'Motywy', value: 'jasny, ciemny, wysoki kontrast' },
  { scope: 'Szerokość ekranu', value: '1280 px (komputer) i 375 px (telefon)' },
  { scope: 'Reguły', value: 'WCAG 2.0, 2.1 i 2.2 na poziomie A i AA oraz dobre praktyki axe' },
  { scope: 'Wynik', value: '0 naruszeń' },
]

export default function AccessibilityStatementPage() {
  useDocumentTitle('Deklaracja dostępności · Splot')
  return (
    <div className="container page statement">
      <h1>Deklaracja dostępności</h1>
      <p>
        Splot chce być dostępny dla każdego, zgodnie z ustawą z 4 kwietnia 2019 r. o dostępności cyfrowej stron
        internetowych i aplikacji mobilnych podmiotów publicznych. Deklaracja dotyczy aplikacji Splot, prototypu
        przygotowanego dla Regionalnego Ośrodka Polityki Społecznej w Krakowie podczas HackYeah 2026.
      </p>
      <ul>
        <li>Data publikacji aplikacji: 2026-10-04</li>
        <li>Data ostatniej aktualizacji: 2026-10-04</li>
      </ul>

      <section aria-labelledby="st-status">
        <h2 id="st-status">Stan dostępności</h2>
        <p>Aplikacja jest <strong>częściowo zgodna</strong> z WCAG 2.1 na poziomie AA z powodu niezgodności i wyłączeń opisanych niżej.</p>
        <h3>Treści niedostępne</h3>
        <ul>
          <li>Ręczne testy czytnikiem ekranu (NVDA) wszystkich modułów nie są jeszcze zakończone.</li>
          <li>Część raportów i folderów ROPS to pliki PDF bez znaczników dostępności. Dla każdego dokumentu w Zasobniku wiedzy jest wersja tekstowa na stronie.</li>
          <li>Filmy w opisach innowacji pochodzą z YouTube. Napisy zależą od autora filmu.</li>
          <li>Tekst w prostym języku i odpowiedzi czatu tworzy model językowy na podstawie bazy ROPS. Tekst nie przeszedł weryfikacji przez osoby z niepełnosprawnością intelektualną.</li>
        </ul>
      </section>

      <section aria-labelledby="st-features" data-tour="start-deklaracja">
        <h2 id="st-features">Ułatwienia w aplikacji</h2>
        <ul>
          <li>Trzy wielkości tekstu i trzy motywy: jasny, ciemny i wysoki kontrast (pasek „Wielkość tekstu i wygląd” na górze strony).</li>
          <li>Rozmowa zamiast formularza. Pytanie można podyktować głosem.</li>
          <li>Przycisk „Przeczytaj” przy odpowiedziach czatu i opisach innowacji.</li>
          <li>Przycisk „Powiedz prościej” na stronie innowacji: opis krótkimi zdaniami, bez trudnych słów.</li>
          <li>Wersja tekstowa każdego dokumentu PDF w Zasobniku wiedzy.</li>
          <li>Obsługa klawiaturą z widocznym fokusem i link „Przejdź do treści” na początku strony.</li>
        </ul>
      </section>

      <section aria-labelledby="st-axe">
        <h2 id="st-axe">Jak sprawdzaliśmy</h2>
        <p>Deklarację sporządzono {AXE_DATE} na podstawie samooceny zespołu: automatycznego testu axe-core i testu klawiaturą.</p>
        <div className="statement-table">
          <table>
            <caption>Automatyczny test axe-core, {AXE_DATE}</caption>
            <tbody>
              {AXE_RESULTS.map(({ scope, value }) => (
                <tr key={scope}>
                  <th scope="row">{scope}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Klawiatura: na 12 sprawdzonych trasach klawisz Tab dochodzi do wszystkich widocznych elementów, a każdy z nich ma widoczny fokus.</p>
        <p>Test automatyczny nie sprawdza zrozumiałości treści ani kolejności czytania. Te elementy sprawdza człowiek.</p>
      </section>

      <section aria-labelledby="st-keys">
        <h2 id="st-keys">Skróty klawiaturowe</h2>
        <p>Aplikacja nie ma własnych skrótów. Działają standardowe skróty przeglądarki i czytnika ekranu.</p>
      </section>

      <section aria-labelledby="st-contact">
        <h2 id="st-contact">Informacje zwrotne i kontakt</h2>
        <p>
          Jeśli coś jest dla Ciebie niedostępne, napisz przez formularz <Link to="/zglos">Zgłoś potrzebę</Link>.
          Pracownik odpowie w wątku zgłoszenia. Po wdrożeniu w ROPS w tym miejscu będą dane koordynatora do spraw dostępności.
        </p>
      </section>

      <section aria-labelledby="st-procedure">
        <h2 id="st-procedure">Żądanie zapewnienia dostępności</h2>
        <p>
          Każdy ma prawo zażądać dostępności cyfrowej strony, jej elementu albo udostępnienia treści w innej formie.
          W żądaniu podaj swoje dane kontaktowe, stronę lub element oraz wygodny dla Ciebie sposób przekazania informacji.
        </p>
        <p>
          Podmiot publiczny spełnia żądanie niezwłocznie, nie później niż w 7 dni. Jeśli nie da się tego zrobić w tym
          terminie, informuje, kiedy to zrobi. Ten termin nie może być dłuższy niż 2 miesiące od złożenia żądania.
        </p>
        <p>
          Jeśli podmiot odmówi albo nie odpowie w terminie, możesz złożyć skargę. Po wyczerpaniu tej procedury możesz
          złożyć wniosek do Rzecznika Praw Obywatelskich.
        </p>
      </section>
    </div>
  )
}
