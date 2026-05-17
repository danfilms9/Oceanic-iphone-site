import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    const loaded = loadEnv(mode, process.cwd(), '')
    const n = (loaded.VITE_GEOAPIFY_KEY || '').trim().length
    console.log(
      `[vite] Geoapify: VITE_GEOAPIFY_KEY from .env length = ${n} (0 means missing or empty; restart after editing .env)`,
    )
  }

  return {
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
  }
})
