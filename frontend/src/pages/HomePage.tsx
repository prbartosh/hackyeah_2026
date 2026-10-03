import { useItems } from '@/hooks/useItems'

export default function HomePage() {
  const { items, loading, error } = useItems()

  if (loading) return <p>Ładowanie…</p>
  if (error) return <p className="error">Błąd: {error}</p>

  return (
    <section>
      <h1>Items</h1>
      {items.length === 0 ? (
        <p>Brak danych.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
