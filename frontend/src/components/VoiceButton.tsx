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
    if (!Ctor) {
      setStatus('Ta przeglądarka nie obsługuje dyktowania. Spróbuj w Chrome lub Edge.')
      return
    }
    const rec = new Ctor()
    rec.lang = 'pl-PL'
    rec.interimResults = false
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(' ')
      if (text) onText(text)
    }
    rec.onend = () => {
      setListening(false)
      setStatus('Dyktowanie zakończone. Sprawdź tekst i wyślij.')
    }
    rec.onerror = () => {
      setListening(false)
      setStatus('Nie udało się rozpoznać mowy. Sprawdź, czy przeglądarka ma dostęp do mikrofonu.')
    }
    recRef.current = rec
    rec.start()
    setListening(true)
    setStatus('Słucham… Mów teraz. Naciśnij ponownie, aby zakończyć.')
  }

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={toggle} aria-pressed={listening}>
        {listening ? <MicOff size={22} aria-hidden="true" /> : <Mic size={22} aria-hidden="true" />}
        {listening ? 'Zakończ dyktowanie' : 'Podyktuj'}
      </button>
      <p className="voice-status" role="status">{status}</p>
    </>
  )
}
