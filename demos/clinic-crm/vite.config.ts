import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = '/crm/demo/clinic/'

export default defineConfig(() => ({
  plugins: [react()],
  base,
  build: {
    outDir: '../../_site/crm/demo/clinic',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4173,
  },
}))
