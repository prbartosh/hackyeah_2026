import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// Baza innowacji dla trybu demonstracyjnego (gdy backend nie ma jeszcze /chat).
// Plik leży poza frontend/, więc w buildzie Dockera (context: ./frontend) go nie ma —
// wtedy moduł zwraca pustą listę zamiast przerywać build.
function innowacjeData(): Plugin {
  const id = 'virtual:innowacje'
  const resolved = '\0' + id
  const file = path.resolve(__dirname, '../assets/innowacje-spoleczne/innowacje.json')
  return {
    name: 'innowacje-data',
    resolveId: (source) => (source === id ? resolved : undefined),
    load(loadId) {
      if (loadId !== resolved) return
      if (!fs.existsSync(file)) {
        this.warn(`Brak ${file} — tryb demonstracyjny bez danych`)
        return 'export default []'
      }
      this.addWatchFile(file)
      return `export default ${fs.readFileSync(file, 'utf8')}`
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), innowacjeData()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 5173 },
})
