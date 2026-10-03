/**
 * Szkielety ładowania: rezerwują miejsce w kształcie treści, więc strona nie skacze po wczytaniu.
 * Czytnik ekranu dostaje tylko krótki komunikat, same bloki są ukryte (aria-hidden).
 */

function Lines({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`skeleton skeleton-line${i === count - 1 ? ' skeleton-mid' : ''}`} />
      ))}
    </>
  )
}

/** Strona szczegółów (innowacja, dokument): nagłówek, treść i kolumna boczna. */
export function DetailSkeleton({ label }: { label: string }) {
  return (
    <div className="container page" aria-busy="true">
      <p role="status" className="visually-hidden">{label}</p>
      <div className="skeleton-page" aria-hidden="true">
        <span className="skeleton skeleton-line skeleton-short" />
        <div className="detail-layout">
          <div className="skeleton-page">
            <span className="skeleton skeleton-kicker" />
            <span className="skeleton skeleton-title" />
            <span className="skeleton skeleton-block" />
            <Lines count={4} />
          </div>
          <div className="skeleton-page">
            <span className="skeleton skeleton-block" />
            <span className="skeleton skeleton-block" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Lista pozycji (zasobnik, dokumenty, wątek). Bez `label`, gdy strona ma już własny komunikat o stanie. */
export function ListSkeleton({ label, count = 4, listClassName = '' }: { label?: string; count?: number; listClassName?: string }) {
  return (
    <div aria-busy="true">
      {label && <p role="status" className="visually-hidden">{label}</p>}
      <ul className={`skeleton-list ${listClassName}`} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="skeleton-item">
            <span className="skeleton skeleton-kicker" />
            <span className="skeleton skeleton-line skeleton-mid" />
            <Lines count={2} />
          </li>
        ))}
      </ul>
    </div>
  )
}
