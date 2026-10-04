import { useLayoutEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useCompare } from '@/hooks/useCompare'
import { compareUrl, MAX_COMPARE, MIN_COMPARE } from '@/lib/compare'
import '@/styles/compare.css'

/** Pływający pasek porównania. Wysokość trafia do --compare-bar-h, żeby przyklejone pole czatu leżało nad paskiem. */
export default function CompareBar() {
  const { items, remove } = useCompare()
  const { pathname } = useLocation()
  const ref = useRef<HTMLElement>(null)
  const visible = items.length >= MIN_COMPARE && pathname !== '/porownaj'

  useLayoutEffect(() => {
    const root = document.documentElement
    const el = ref.current
    if (!visible || !el) return
    const update = () => root.style.setProperty('--compare-bar-h', `${el.offsetHeight}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { ro.disconnect(); root.style.removeProperty('--compare-bar-h') }
  }, [visible])

  return (
    <>
      <p className="visually-hidden" aria-live="polite">
        {items.length > 0 ? `Wybrano do porównania: ${items.length} z ${MAX_COMPARE}.` : ''}
      </p>
      {visible && (
        <nav ref={ref} className="compare-bar no-print" aria-label="Porównanie innowacji">
          <ul className="compare-chips">
            {items.map((i) => (
              <li key={i.slug} className="compare-chip">
                <span className="compare-chip-name">{i.nazwa}</span>
                <button type="button" className="compare-chip-remove" onClick={() => remove(i.slug)} aria-label={`Usuń z porównania: ${i.nazwa}`}>
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <Link to={compareUrl(items.map((i) => i.slug))} className="btn btn-primary">Porównaj ({items.length})</Link>
        </nav>
      )}
    </>
  )
}
