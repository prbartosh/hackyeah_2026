import { useEffect, useRef, useState } from 'react'
import { Square, Volume2 } from 'lucide-react'

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

// Jedna wypowiedź naraz: nowy przycisk przerywa poprzedni i daje mu znać, że skończył
let stopCurrent: (() => void) | null = null

/** Czytanie na głos przez Web Speech API (w przeglądarce, bez serwera). */
export default function ReadAloudButton({ text, label = 'Przeczytaj' }: { text: string; label?: string }) {
  const [speaking, setSpeaking] = useState(false)
  const stopRef = useRef(() => {
    setSpeaking(false)
    if (stopCurrent === stopRef.current) stopCurrent = null
  })

  // Wyjście ze strony przerywa czytanie
  useEffect(() => () => {
    if (stopCurrent === stopRef.current) {
      stopCurrent = null
      speechSynthesis.cancel()
    }
  }, [])

  const toggle = () => {
    const stop = stopRef.current
    if (speaking) {
      speechSynthesis.cancel()
      stop()
      return
    }
    stopCurrent?.()
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pl-PL'
    const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('pl'))
    if (voice) utterance.voice = voice
    utterance.rate = 0.95
    utterance.onend = stop
    utterance.onerror = stop
    stopCurrent = stop
    speechSynthesis.speak(utterance)
    setSpeaking(true)
  }

  // Przeglądarka bez syntezy mowy: nie pokazujemy przycisku, który nic nie zrobi
  if (!supported() || !text.trim()) return null

  return (
    <button type="button" className="btn btn-ghost btn-read" onClick={toggle}>
      {speaking ? <Square size={16} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
      {speaking ? 'Zatrzymaj' : label}
    </button>
  )
}
