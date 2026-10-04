import { useEffect, useState, type CSSProperties } from 'react'
import { arrow as arrowMw, autoUpdate, computePosition, flip, offset, shift, size, type Placement } from '@floating-ui/dom'

export interface Position {
  x: number
  y: number
  placement: Placement
  arrowX: number | null
  arrowY: number | null
}

/** Pozycja dymka przy elemencie: flip/shift, aktualizacja przy scrollu, resize i zmianie rozmiaru. */
export function usePosition(
  reference: HTMLElement | null,
  floating: HTMLElement | null,
  arrowEl: HTMLElement | null,
  placement: Placement,
  enabled: boolean,
): Position | null {
  const [pos, setPos] = useState<Position | null>(null)

  useEffect(() => {
    if (!enabled || !reference || !floating) {
      setPos(null)
      return
    }
    const update = () => {
      computePosition(reference, floating, {
        placement,
        strategy: 'fixed',
        middleware: [
          offset(16),
          flip({ padding: 8, fallbackStrategy: 'bestFit' }),
          shift({ padding: 8, crossAxis: true }),
          size({
            padding: 8,
            apply({ availableHeight }) {
              floating.style.maxHeight = `${Math.max(180, Math.floor(availableHeight))}px`
            },
          }),
          ...(arrowEl ? [arrowMw({ element: arrowEl, padding: 14 })] : []),
        ],
      }).then(({ x, y, placement: p, middlewareData }) => {
        setPos((prev) => {
          const next = { x: Math.round(x), y: Math.round(y), placement: p, arrowX: middlewareData.arrow?.x ?? null, arrowY: middlewareData.arrow?.y ?? null }
          return prev && prev.x === next.x && prev.y === next.y && prev.placement === next.placement && prev.arrowX === next.arrowX && prev.arrowY === next.arrowY ? prev : next
        })
      })
    }
    return autoUpdate(reference, floating, update, { animationFrame: true })
  }, [reference, floating, arrowEl, placement, enabled])

  return pos
}

const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const

export function arrowStyle(pos: Position): CSSProperties {
  const side = OPPOSITE[pos.placement.split('-')[0] as keyof typeof OPPOSITE]
  return {
    left: pos.arrowX != null ? `${pos.arrowX}px` : undefined,
    top: pos.arrowY != null ? `${pos.arrowY}px` : undefined,
    [side]: '-0.5rem',
  }
}
