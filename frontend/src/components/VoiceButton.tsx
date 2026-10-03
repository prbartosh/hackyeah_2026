import { useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

// Minimalne typy Web Speech API (brak ich w lib.dom)
interface Recognition {
  lang: string
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}
type RecognitionCtor = new () => Recognition

function getRecognition(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export default function VoiceButton({ onText }: { onText: (text: string) => void }) {
  const [listening, setListening] = useState(false)
  const [status, setStatus] = useState('')
  const recRef = useRef<Recognition | null>(null)

  const toggle = () => {
    if (listening) {
      recRef.current?.stop()
      return
    }
    const Ctor = getRecognition()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = 'pl-PL'
    rec.interimResults = false
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(' ')
      if (text) onText(text)
    }
    rec.onend = () => {
      setListening(false)
      setStatus('Gotowe. Sprawdź tekst i wyślij.')
    }
    rec.onerror = () => {
      setListening(false)
      setStatus('Nie udało się. Sprawdź dostęp do mikrofonu.')
    }
    recRef.current = rec
    rec.start()
    setListening(true)
    setStatus('Słucham… Mów teraz.')
  }

  // Przeglądarka bez Web Speech API (np. Firefox): nie pokazujemy przycisku, który i tak nic nie zrobi
  if (!getRecognition()) return null

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={toggle}>
        {listening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
        {listening ? 'Zakończ' : 'Podyktuj'}
      </button>
      <p className="voice-status" role="status">{status}</p>
    </>
  )
}
