import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    // `npm run dev`: /api trafia do backendu (docker compose up backend → :8000), bez CORS.
    // Adres można zmienić: VITE_PROXY_TARGET=http://host:8000 npm run dev
    proxy: { '/api': process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:8000' },
  },
})
