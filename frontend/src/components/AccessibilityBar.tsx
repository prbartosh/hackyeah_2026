import { useRef, useState } from 'react'
import { Check, Contrast, Moon, Settings, Sun } from 'lucide-react'
import { useAccessibility, type FontSize, type ThemeMode } from '@/context/AccessibilityContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const fontOptions: { key: FontSize; label: string; ariaLabel: string; size: string; tour?: string }[] = [
  { key: 'normal', label: 'A', ariaLabel: 'Tekst normalny', size: '0.95rem', tour: 'dostepnosc-tekst-normalny' },
  { key: 'large', label: 'A+', ariaLabel: 'Tekst duży', size: '1.1rem', tour: 'dostepnosc-tekst-duzy' },
  { key: 'xlarge', label: 'A++', ariaLabel: 'Tekst bardzo duży', size: '1.25rem', tour: 'dostepnosc-tekst-bardzo-duzy' },
]

const themeOptions: { key: ThemeMode; label: string; icon: typeof Sun; tour: string }[] = [
  { key: 'standard', label: 'Jasny', icon: Sun, tour: 'dostepnosc-motyw-jasny' },
  { key: 'dark', label: 'Ciemny', icon: Moon, tour: 'dostepnosc-motyw-ciemny' },
  { key: 'high-contrast', label: 'Wysoki kontrast', icon: Contrast, tour: 'dostepnosc-motyw-wysoki-kontrast' },
]

function Controls() {
  const { fontSize, themeMode, setFontSize, setThemeMode } = useAccessibility()

  return (
    <div className="a11y-controls" role="toolbar" aria-label="Wielkość tekstu i wygląd strony">
      <div className="a11y-group" role="group" aria-labelledby="a11y-font-label" data-tour="dostepnosc-tekst">
        <span id="a11y-font-label" className="a11y-label">Wielkość tekstu:</span>
        <div className="a11y-options">
          {fontOptions.map(({ key, label, ariaLabel, size, tour }) => (
            <button
              key={key}
              data-tour={tour}
              type="button"
              className="a11y-btn"
              onClick={() => setFontSize(key)}
              aria-label={ariaLabel}
              aria-pressed={fontSize === key}
              style={{ fontSize: size, fontWeight: 800 }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="a11y-group" role="group" aria-labelledby="a11y-theme-label" data-tour="dostepnosc-motyw">
        <span id="a11y-theme-label" className="a11y-label">Wygląd:</span>
        <div className="a11y-options">
          {themeOptions.map(({ key, label, icon: Icon, tour }) => (
            <button
              key={key}
              data-tour={tour}
              type="button"
              className="a11y-btn"
              onClick={() => setThemeMode(key)}
              aria-pressed={themeMode === key}
            >
              {themeMode === key
                ? <Check className="check" size={18} strokeWidth={3} aria-hidden="true" />
                : <Icon size={18} aria-hidden="true" />}
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Na wąskim ekranie pasek zwija się do jednego przycisku, żeby treść była widoczna od razu. */
export default function AccessibilityBar() {
  const compact = useMediaQuery('(max-width: 48rem)')
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  if (!compact) return <Controls />

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div
      className="a11y-compact"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          close()
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="a11y-btn a11y-toggle"
        aria-expanded={open}
        aria-controls="a11y-panel"
        data-tour="dostepnosc-rozwin"
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Settings size={18} aria-hidden="true" />
        Ustawienia dostępności
      </button>
      {open && (
        <div id="a11y-panel" className="a11y-panel">
          <Controls />
        </div>
      )}
    </div>
  )
}
