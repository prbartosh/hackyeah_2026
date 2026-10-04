import { useState } from 'react'
import { Link } from 'react-router-dom'
import { loadThreads } from '@/lib/myThreads'

interface Props {
  /** Nagłówek sekcji (poziom h2). */
  title?: string
  /** Token wątku, który pokazujemy osobno (np. bieżąca strona). */
  exclude?: string
  /** Bez wpisów nic nie renderujemy (np. pod wątkiem), zamiast komunikatu o pustej liście. */
  hideWhenEmpty?: boolean
  /** Poziom nagłówka, gdy lista jest częścią większej sekcji. */
  heading?: 'h2' | 'h3'
}

/** Lista spraw zapisanych w tej przeglądarce: linki do wątków bez konta. */
export default function MyThreadsList({ title = 'Moje sprawy', exclude, hideWhenEmpty = false, heading: Heading = 'h2' }: Props) {
  const [threads] = useState(loadThreads)
  const items = threads.filter((t) => t.token !== exclude)
  if (items.length === 0 && hideWhenEmpty) return null

  return (
    <section aria-labelledby="my-threads-h" className="my-threads" data-tour="wspolpraca-lista-spraw">
      <Heading id="my-threads-h">{title}</Heading>
      {items.length === 0 ? (
        <p className="hint">Nie masz jeszcze zapisanych spraw. Po wysłaniu zgłoszenia pojawi się tu link do rozmowy.</p>
      ) : (
        <>
          <ul>
            {items.map((t) => (
              <li key={t.token}>
                <Link to={`/watek/${t.token}`}>{t.opis || 'Zgłoszenie bez opisu'}</Link>
              </li>
            ))}
          </ul>
          <p className="hint">Lista jest zapisana tylko w tej przeglądarce.</p>
        </>
      )}
    </section>
  )
}
