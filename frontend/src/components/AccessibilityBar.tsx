import { Check, Contrast, Moon, Sun } from 'lucide-react'
import { useAccessibility, type FontSize, type ThemeMode } from '@/context/AccessibilityContext'

const fontOptions: { key: FontSize; label: string; ariaLabel: string; size: string }[] = [
  { key: 'normal', label: 'A', ariaLabel: 'Tekst normalny', size: '0.95rem' },
  { key: 'large', label: 'A+', ariaLabel: 'Tekst duży', size: '1.1rem' },
  { key: 'xlarge', label: 'A++', ariaLabel: 'Tekst bardzo duży', size: '1.25rem' },
]

const themeOptions: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
  { key: 'standard', label: 'Jasny', icon: Sun },
  { key: 'dark', label: 'Ciemny', icon: Moon },
  { key: 'high-contrast', label: 'Wysoki kontrast', icon: Contrast },
]

export default function AccessibilityBar() {
  const { fontSize, themeMode, setFontSize, setThemeMode } = useAccessibility()

  return (
    <section className="a11y-bar" aria-label="Ułatwienia dostępu">
      <a href="#main-content" className="skip-link">
        Przejdź do głównej treści
      </a>
      <div className="container a11y-bar-inner" role="toolbar" aria-label="Wielkość tekstu i wygląd strony">
        <div className="a11y-group" role="group" aria-labelledby="a11y-font-label">
          <span id="a11y-font-label" className="a11y-label">Wielkość tekstu:</span>
          <div className="a11y-options">
            {fontOptions.map(({ key, label, ariaLabel, size }) => (
              <button
                key={key}
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

        <div className="a11y-group" role="group" aria-labelledby="a11y-theme-label">
          <span id="a11y-theme-label" className="a11y-label">Wygląd:</span>
          <div className="a11y-options">
            {themeOptions.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
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
    </section>
  )
}
