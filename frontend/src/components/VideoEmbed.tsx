import { useEffect, useRef, useState } from 'react'
import { ExternalLink, PlayCircle } from 'lucide-react'
import { youtubeId } from '@/lib/youtube'

interface Props {
  url: string
  nazwa: string
}

// Odtwarzacz YouTube wczytujemy dopiero po kliknięciu: nie wysyłamy danych do Google
// bez decyzji użytkownika, a strona szybciej się ładuje. Używamy youtube-nocookie.com.
export default function VideoEmbed({ url, nazwa }: Props) {
  const [aktywny, setAktywny] = useState(false)
  const id = youtubeId(url)
  const ramka = useRef<HTMLIFrameElement>(null)

  // Przycisk znika po kliknięciu, więc fokus przenosimy na odtwarzacz (inaczej wraca na początek strony)
  useEffect(() => {
    if (aktywny) ramka.current?.focus()
  }, [aktywny])

  return (
    <div className="zs-video">
      {id && aktywny ? (
        <iframe
          ref={ramka}
          className="zs-video-frame"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&cc_load_policy=1&hl=pl`}
          title={`Film o innowacji: ${nazwa}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : id ? (
        <button type="button" className="zs-video-start" onClick={() => setAktywny(true)}>
          <PlayCircle size={48} aria-hidden="true" />
          <span className="zs-video-label">Odtwórz film o innowacji „{nazwa}”</span>
          <span className="hint">Po kliknięciu wczytamy odtwarzacz z serwisu YouTube.</span>
        </button>
      ) : null}
      <p>
        <a href={url} target="_blank" rel="noreferrer" className="link-ext">
          Obejrzyj film w serwisie YouTube <ExternalLink size={16} aria-hidden="true" />
          <span className="visually-hidden"> (otwiera się w nowej karcie)</span>
        </a>
      </p>
    </div>
  )
}
