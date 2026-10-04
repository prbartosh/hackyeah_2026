import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Handshake, HelpCircle, MessageSquareText, UserRound, UsersRound, type LucideIcon } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import MyThreadsList from '@/components/MyThreadsList'
import { readRozmowy, rozmowaPath } from '@/lib/rozmowy'
import '@/styles/cooperation.css'

interface Tile {
  to: string
  title: string
  text: string
  Icon: LucideIcon
}

const TILES: Tile[] = [
  { to: '/pytania', title: 'Zadaj pytanie', text: 'Zapytaj ROPS o to, czego nie znalazłeś. Odpowiedzi są publiczne, więc pomagają innym.', Icon: HelpCircle },
  { to: '/zglos', title: 'Zgłoś potrzebę', text: 'Opisz problem w swojej gminie, a pracownik ROPS wskaże rozwiązania.', Icon: MessageSquareText },
  { to: '/mentorzy', title: 'Poproś o mentora', text: 'Doświadczona osoba pomoże Ci wdrożyć rozwiązanie krok po kroku.', Icon: UserRound },
  { to: '/partnerstwa', title: 'Znajdź partnera', text: 'Połącz siły z inną instytucją, organizacją albo firmą.', Icon: Handshake },
  { to: '#moje-sprawy', title: 'Moje sprawy', text: 'Wróć do rozmów, które już zacząłeś.', Icon: UsersRound },
]

function TileBody({ title, text, Icon }: Tile) {
  return (
    <>
      <Icon aria-hidden="true" focusable="false" size={28} />
      <span className="coop-tile-title">{title}</span>
      <span>{text}</span>
    </>
  )
}

/** Hub modułu V: skąd zacząć kontakt z ROPS, bez zakładania konta. */
export default function CooperationPage() {
  useDocumentTitle('Współpraca z ROPS · Splot')
  // Odczyt jednorazowy: lista zmienia się dopiero po wejściu na inną stronę
  const [rozmowy] = useState(readRozmowy)

  return (
    <div className="container page coop">
      <h1>Współpraca z ROPS</h1>
      <p className="coop-lead">
        Nie znalazłeś gotowego rozwiązania albo chcesz coś zrobić razem z innymi? Wybierz, w czym możemy pomóc. Konto nie jest potrzebne.
      </p>

      <ul className="coop-tiles" data-tour="wspolpraca-kafelki" aria-label="Wybierz, czego potrzebujesz">
        {TILES.map((t) => (
          <li key={t.to}>
            {t.to.startsWith('#') ? (
              <a className="coop-tile" href={t.to}><TileBody {...t} /></a>
            ) : (
              <Link className="coop-tile" to={t.to}><TileBody {...t} /></Link>
            )}
          </li>
        ))}
      </ul>

      <section aria-labelledby="coop-jak" data-tour="wspolpraca-jak">
        <h2 id="coop-jak">Jak to działa</h2>
        <ol className="coop-steps">
          <li>Piszesz: pytanie, zgłoszenie albo ogłoszenie.</li>
          <li>ROPS odpowiada w wątku albo łączy Cię z mentorem lub partnerem.</li>
          <li>Dostajesz e-mail z linkiem do rozmowy. Nie zakładasz konta.</li>
        </ol>
      </section>

      <section aria-labelledby="coop-dane">
        <h2 id="coop-dane">Twoje dane</h2>
        <p>Adres e-mail widzi tylko ROPS. Nie pokazujemy go innym użytkownikom.</p>
      </section>

      <section id="moje-sprawy" aria-labelledby="coop-sprawy" tabIndex={-1} data-tour="wspolpraca-moje-sprawy">
        <h2 id="coop-sprawy">Moje sprawy</h2>
        <MyThreadsList title="Zgłoszenia" heading="h3" />
        <h3>Rozmowy partnerskie</h3>
        {rozmowy.length === 0 ? (
          <p className="hint">
            Nie masz jeszcze rozmów w tej przeglądarce. Gdy odpowiesz na ogłoszenie w <Link to="/partnerstwa">Giełdzie partnerstw</Link>, rozmowa pojawi się tutaj.
          </p>
        ) : (
          <ul className="coop-list">
            {rozmowy.map((r) => (
              <li key={r.token}>
                <Link to={rozmowaPath(r.token)}>{r.tytul}</Link>
                <span className="hint"> · {r.data}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
