import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = '/crm/demo/flower/'

export default defineConfig(() => ({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEMO_MODE': JSON.stringify('true'),
  },
  base,
  build: {
    outDir: '../../_site/crm/demo/flower',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4174,
  },
}))
