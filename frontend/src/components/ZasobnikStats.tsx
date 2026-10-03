import { useEffect, useState } from 'react'
import { BarChart3, FileText, Lightbulb, Map } from 'lucide-react'
import { listDocuments } from '@/api/documents'

interface Props {
  innowacje: number
  kategorie: number
}

interface Counts { raporty: number; wskazniki: number }

/** Pasek liczb: ile wiedzy jest w zasobniku. Przy błędzie API pokazuje tylko to, co już wiadomo. */
export default function ZasobnikStats({ innowacje, kategorie }: Props) {
  const [c, setC] = useState<Counts | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    listDocuments({}, controller.signal)
      .then((docs) => setC({
        raporty: docs.filter((d) => d.typ !== 'wskaznik').length,
        wskazniki: docs.filter((d) => d.typ === 'wskaznik').length,
      }))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const items = [
    { icon: Lightbulb, n: innowacje, label: `innowacji w ${kategorie} kategoriach` },
    { icon: FileText, n: c?.raporty, label: 'raportów i publikacji' },
    { icon: BarChart3, n: c?.wskazniki, label: 'wskaźników z wykresami' },
    { icon: Map, n: 22, label: 'powiatów w danych' },
  ]
  return (
    <ul className="zs-stats" aria-label="Zawartość zasobnika">
      {items.filter((i) => i.n).map(({ icon: Icon, n, label }) => (
        <li key={label}>
          <Icon size={20} aria-hidden="true" />
          <strong>{n}</strong>
          <span>{label}</span>
        </li>
      ))}
    </ul>
  )
}
