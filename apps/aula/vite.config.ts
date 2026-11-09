import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves the classroom under /proteqlife-web/aula/; Vercel
  // serves it at the root. Set VITE_BASE_PATH for the target host.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  // En desarrollo, las llamadas a /api se reenvían al servidor (apps/api).
  server: { proxy: { '/api': { target: process.env.VITE_API_PROXY || 'http://localhost:3001', changeOrigin: true } } },
  // Production bundles carry no console/debugger statements or source maps.
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : undefined,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
}))
