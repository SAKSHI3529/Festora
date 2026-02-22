import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  appType: 'spa',      // ensures 200 fallback for all routes (fixes blank on back)
  server: {
    port: 3100,
    proxy: {
      // Proxy /api/* → http://localhost:8000/* (avoids CORS for same-origin requests)
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
})
