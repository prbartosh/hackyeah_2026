import { useEffect, useState } from 'react'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const PAD = 6

/** Przyciemnienie ekranu z wycięciem wokół elementu i pulsującą obwódką. Nie przechwytuje myszy ani fokusu. */
export default function Spotlight({ element }: { element: HTMLElement | null }) {
  const [rect, setRect] = useState<Rect | null>(null)
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    if (!element) {
      setRect(null)
      return
    }
    let raf = 0
    const tick = () => {
      const r = element.getBoundingClientRect()
      const next = { x: Math.round(r.left - PAD), y: Math.round(r.top - PAD), w: Math.round(r.width + PAD * 2), h: Math.round(r.height + PAD * 2) }
      setRect((prev) => (prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h ? prev : next))
      raf = requestAnimationFrame(tick)
    }
    tick()
    // animacja przejścia tylko przy zmianie elementu, żeby nie spóźniać się przy przewijaniu
    setMoving(true)
    const t = window.setTimeout(() => setMoving(false), 400)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
    }
  }, [element])

  if (!rect) return null
  const geometry = { x: rect.x, y: rect.y, width: Math.max(rect.w, 0), height: Math.max(rect.h, 0), rx: 14 }
  return (
    <svg className={`tour-spot${moving ? ' is-moving' : ''}`} aria-hidden="true" focusable="false" width="100%" height="100%">
      <defs>
        <mask id="tour-spot-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect {...geometry} fill="black" />
        </mask>
      </defs>
      <rect className="tour-dim" width="100%" height="100%" mask="url(#tour-spot-mask)" />
      <rect className="tour-ring" {...geometry} fill="none" />
    </svg>
  )
}
