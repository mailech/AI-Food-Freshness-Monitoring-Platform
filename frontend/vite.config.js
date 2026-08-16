import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/inventory': 'http://127.0.0.1:8000',
      '/analysis': 'http://127.0.0.1:8000',
      '/storage': 'http://127.0.0.1:8000',
      '/recommendations': 'http://127.0.0.1:8000',
      '/notifications': 'http://127.0.0.1:8000',
      '/reports': 'http://127.0.0.1:8000',
      '/dashboard': 'http://127.0.0.1:8000',
      '/uploads': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    }
  }
})
