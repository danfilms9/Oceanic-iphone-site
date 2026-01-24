import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
  },
  server: {
    // In local dev, use vercel dev to run serverless functions
    // If you need to use a separate Express server, uncomment the proxy below
    // proxy: process.env.NODE_ENV === 'development' ? {
    //   '/api': {
    //     target: 'http://localhost:3001',
    //     changeOrigin: true,
    //   },
    // } : undefined,
  },
})
