import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export type FontSize = 'normal' | 'large' | 'xlarge'
export type ThemeMode = 'standard' | 'high-contrast' | 'dark'

const FONT_SIZES: FontSize[] = ['normal', 'large', 'xlarge']
const THEMES: ThemeMode[] = ['standard', 'high-contrast', 'dark']

interface AccessibilityContextValue {
  fontSize: FontSize
  themeMode: ThemeMode
  setFontSize: (size: FontSize) => void
  setThemeMode: (mode: ThemeMode) => void
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

function readStored<T extends string>(key: string, allowed: T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key) as T | null
    return value && allowed.includes(value) ? value : fallback
  } catch {
    return fallback
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>(() =>
    readStored('hubmi-font-size', FONT_SIZES, 'normal'),
  )
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    readStored('hubmi-theme', THEMES, 'standard'),
  )

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size)
    try { localStorage.setItem('hubmi-font-size', size) } catch { /* noop */ }
  }, [])

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode)
    try { localStorage.setItem('hubmi-theme', mode) } catch { /* noop */ }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize
  }, [fontSize])

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])

  return (
    <AccessibilityContext.Provider value={{ fontSize, themeMode, setFontSize, setThemeMode }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider')
  return ctx
}
