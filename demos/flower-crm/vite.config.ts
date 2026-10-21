import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEMO_MODE': JSON.stringify('true'),
  },
  base: command === 'build' ? '/crm/demo/flower/' : '/',
  build: {
    outDir: '../../_site/crm/demo/flower',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5174,
  },
  preview: {
    host: true,
  },
}))
