import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `npm run dev` -> frontend sa :5173, ipinapasa ang /api sa backend (:3001).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3001' } },
})
