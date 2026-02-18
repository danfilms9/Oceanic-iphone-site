import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
  },
  server: {
    // Proxy /api to the Notion proxy server (server-example) when running dev server.
    // Run the API server: cd server-example && npm start
    proxy: command === 'serve' ? {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    } : undefined,
  },
}))
