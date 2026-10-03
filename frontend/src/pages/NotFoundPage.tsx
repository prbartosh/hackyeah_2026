import { Link } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function NotFoundPage() {
  useDocumentTitle('Nie znaleziono strony · Splot')
  return (
    <div className="container page">
      <h1>Nie znaleziono strony</h1>
      <p>Strona, której szukasz, nie istnieje lub została przeniesiona.</p>
      <p><Link to="/">Wróć do strony głównej</Link></p>
    </div>
  )
}
